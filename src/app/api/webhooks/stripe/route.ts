import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
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
    })
  } catch (error) {
    console.error('[stripe-webhook] échec du traitement', event.id, event.type, error)
    // 500 : Stripe retentera l'envoi (l'idempotence via stripe_webhook_events
    // garantit qu'un traitement déjà réussi ne sera jamais rejoué).
    return new Response('Processing failed', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
