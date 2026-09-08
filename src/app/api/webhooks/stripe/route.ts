import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAmbassadorCouponId } from '@/features/billing/server/ambassador'
import {
  handleStripeEvent,
  type StripeSubscriptionLike,
  type SubscriptionUpsert,
  type WebhookRepository,
} from '@/features/billing/server/stripeWebhookCore'

export const runtime = 'nodejs'

function toStripeSubscriptionLike(subscription: Stripe.Subscription): StripeSubscriptionLike {
  return {
    id: subscription.id,
    customer: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    metadata: subscription.metadata,
    items: {
      data: subscription.items.data.map((item) => ({
        current_period_end: item.current_period_end,
        price: { recurring: item.price.recurring ? { interval: item.price.recurring.interval } : null },
      })),
    },
  }
}

function createWebhookRepository(admin: ReturnType<typeof createAdminClient>): WebhookRepository {
  return {
    async isEventProcessed(eventId) {
      const { data, error } = await admin
        .from('stripe_webhook_events')
        .select('id')
        .eq('id', eventId)
        .maybeSingle()

      if (error) {
        console.error('[stripe-webhook] échec de la vérification d’idempotence', error)
        throw new Error('WEBHOOK_EVENT_LOOKUP_FAILED')
      }

      return data !== null
    },
    async markEventProcessed(eventId, type) {
      const { error } = await admin.from('stripe_webhook_events').insert({ id: eventId, type })
      // Code Postgres 23505 = violation de contrainte unique : deux livraisons
      // quasi simultanées du même événement ont toutes deux réussi leur
      // traitement (idempotent par nature, voir upsertSubscription) et
      // tentent de marquer l'événement en même temps — inoffensif, on ignore.
      if (error && error.code !== '23505') {
        console.error('[stripe-webhook] échec de l’enregistrement de l’événement', error)
        throw new Error('WEBHOOK_EVENT_MARK_FAILED')
      }
    },
    async upsertSubscription(upsert: SubscriptionUpsert) {
      const { error } = await admin
        .from('subscriptions')
        .upsert(
          {
            user_id: upsert.userId,
            stripe_customer_id: upsert.stripeCustomerId,
            stripe_subscription_id: upsert.stripeSubscriptionId,
            status: upsert.status,
            price_interval: upsert.priceInterval,
            cancel_at_period_end: upsert.cancelAtPeriodEnd,
            current_period_end: upsert.currentPeriodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (error) {
        console.error('[stripe-webhook] échec de la mise à jour de l’abonnement', error)
        throw new Error('SUBSCRIPTION_UPSERT_FAILED')
      }
    },
    async recordAmbassadorReferral(ambassadorUserId: string, referredUserId: string) {
      const { error: insertError } = await admin
        .from('ambassador_redemptions')
        .insert({ ambassador_user_id: ambassadorUserId, referred_user_id: referredUserId })

      if (insertError) {
        // Code Postgres 23505 = violation de contrainte unique sur
        // `referred_user_id` : ce filleul a déjà été enregistré (pour cet
        // ambassadeur ou un autre, ex. réabonnement après résiliation) — c'est
        // le comportement voulu (US-11), pas une erreur à faire remonter.
        if (insertError.code === '23505') return null
        console.error('[stripe-webhook] échec de l’enregistrement de la recommandation', insertError)
        throw new Error('AMBASSADOR_REFERRAL_RECORD_FAILED')
      }

      const { count, error: countError } = await admin
        .from('ambassador_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('ambassador_user_id', ambassadorUserId)

      if (countError) {
        console.error('[stripe-webhook] échec du comptage des recommandations', countError)
        throw new Error('AMBASSADOR_REFERRAL_COUNT_FAILED')
      }
      return count ?? 1
    },
    async getAmbassadorStripeSubscriptionId(ambassadorUserId: string) {
      const { data, error } = await admin
        .from('subscriptions')
        .select('stripe_subscription_id, status')
        .eq('user_id', ambassadorUserId)
        .maybeSingle()

      if (error) {
        console.error('[stripe-webhook] échec de la lecture de l’abonnement de l’ambassadeur', error)
        return null
      }
      // Un abonnement 'canceled' est terminal côté Stripe (Stripe refuse toute
      // mise à jour) : seuls 'active'/'past_due' peuvent recevoir le nouveau
      // rabais immédiatement, les autres cas l'appliqueront à leur prochain checkout.
      if (!data?.stripe_subscription_id || (data.status !== 'active' && data.status !== 'past_due')) {
        return null
      }
      return data.stripe_subscription_id
    },
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error) {
    console.error('[stripe-webhook] signature invalide', error)
    return new Response('Invalid signature', { status: 400 })
  }

  const admin = createAdminClient()

  try {
    await handleStripeEvent(event, {
      repository: createWebhookRepository(admin),
      async retrieveSubscription(subscriptionId) {
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
        return toStripeSubscriptionLike(subscription)
      },
      async applyAmbassadorDiscount(stripeSubscriptionId, discountPercent) {
        const couponId = getAmbassadorCouponId(discountPercent)
        // Coupon manquant en config (déjà logué par getAmbassadorCouponId) :
        // on n'applique pas le rabais cette fois plutôt que de faire échouer
        // tout le traitement de l'événement — un coupon Dashboard oublié ne
        // doit jamais bloquer indéfiniment ce webhook en retry.
        if (!couponId) return
        await getStripe().subscriptions.update(stripeSubscriptionId, { discounts: [{ coupon: couponId }] })
      },
    })
  } catch (error) {
    console.error('[stripe-webhook] échec du traitement', event.id, event.type, error)
    // 500 : Stripe retentera l'envoi (l'idempotence via stripe_webhook_events
    // garantit qu'un traitement déjà réussi ne sera jamais rejoué).
    return new Response('Processing failed', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
