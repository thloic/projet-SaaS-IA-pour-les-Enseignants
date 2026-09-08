import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCheckoutSessionParams } from '../../src/features/billing/server/checkoutCore.ts'
import {
  handleStripeEvent,
  type StripeSubscriptionLike,
  type SubscriptionUpsert,
  type WebhookDeps,
} from '../../src/features/billing/server/stripeWebhookCore.ts'
import { ambassadorDiscountPercent } from '../../src/features/billing/server/ambassadorCore.ts'

const AMBASSADOR = '33333333-3333-4333-8333-333333333333'
const FILLEUL = '11111111-1111-4111-8111-111111111111'
const PRICE_IDS = { month: 'price_month_123', year: 'price_year_456' }
const APP_URL = 'https://educassist.example.com'

function fakeWebhookDeps(
  subscriptionsById: Record<string, StripeSubscriptionLike>,
  ambassadorSubscriptionId: string | null
) {
  const upserts: SubscriptionUpsert[] = []
  const discountApplications: Array<{ stripeSubscriptionId: string; discountPercent: number }> = []
  const referrals: Array<{ ambassadorUserId: string; referredUserId: string }> = []
  const processedEventIds = new Set<string>()

  const deps: WebhookDeps = {
    repository: {
      async isEventProcessed(eventId) {
        return processedEventIds.has(eventId)
      },
      async markEventProcessed(eventId) {
        processedEventIds.add(eventId)
      },
      async upsertSubscription(upsert) {
        upserts.push(upsert)
      },
      async recordAmbassadorReferral(ambassadorUserId, referredUserId) {
        referrals.push({ ambassadorUserId, referredUserId })
        return referrals.length
      },
      async getAmbassadorStripeSubscriptionId() {
        return ambassadorSubscriptionId
      },
    },
    async retrieveSubscription(subscriptionId) {
      const subscription = subscriptionsById[subscriptionId]
      if (!subscription) throw new Error('SUBSCRIPTION_NOT_FOUND')
      return subscription
    },
    async applyAmbassadorDiscount(stripeSubscriptionId, discountPercent) {
      discountApplications.push({ stripeSubscriptionId, discountPercent })
    },
  }

  return { deps, upserts, discountApplications, referrals }
}

// Ce test traverse les deux frontières que les tests unitaires (billing-checkout,
// stripe-webhook-handler) vérifient séparément avec des metadata écrites à la
// main : ici, les metadata consommées par le webhook sont celles RÉELLEMENT
// produites par buildCheckoutSessionParams. Il aurait détecté, par exemple, un
// renommage de la clé `ambassador_user_id` d'un seul côté du contrat.
test('parcours complet : un filleul indique le code d’un ambassadeur déjà abonné → le webhook enregistre la recommandation et met à jour son rabais immédiatement', async () => {
  // 1. Route de checkout du FILLEUL (l'ambassadorUserId est déjà résolu et
  // validé en amont — voir src/app/api/billing/checkout/route.ts).
  const filleulCheckoutParams = buildCheckoutSessionParams({
    userId: FILLEUL,
    email: 'filleul@example.com',
    interval: 'month',
    existingCustomerId: null,
    appUrl: APP_URL,
    priceIds: PRICE_IDS,
    ambassadorUserId: AMBASSADOR,
  })

  assert.equal(filleulCheckoutParams.discounts, undefined, 'le filleul ne paie jamais moins cher')

  // 2. Stripe confirme le paiement : l'abonnement créé porte les metadata
  // telles que produites à l'étape 1 (pas re-tapées à la main).
  const filleulSubscription: StripeSubscriptionLike = {
    id: 'sub_filleul',
    customer: 'cus_filleul',
    status: 'active',
    cancel_at_period_end: false,
    metadata: filleulCheckoutParams.subscription_data!.metadata as Record<string, string>,
    items: {
      data: [{ current_period_end: 1_800_000_000, price: { recurring: { interval: 'month' } } }],
    },
  }

  const { deps, upserts, discountApplications, referrals } = fakeWebhookDeps(
    { sub_filleul: filleulSubscription },
    'sub_ambassador_existing'
  )

  await handleStripeEvent(
    {
      id: 'evt_checkout_filleul',
      type: 'checkout.session.completed',
      data: {
        object: {
          subscription: 'sub_filleul',
          client_reference_id: filleulCheckoutParams.client_reference_id ?? null,
        },
      },
    },
    deps
  )

  assert.equal(upserts.length, 1)
  assert.equal(upserts[0].userId, FILLEUL)
  assert.deepEqual(referrals, [{ ambassadorUserId: AMBASSADOR, referredUserId: FILLEUL }])
  assert.deepEqual(discountApplications, [{ stripeSubscriptionId: 'sub_ambassador_existing', discountPercent: 10 }])
})

// Symétrique du test précédent : l'ambassadeur qui passe lui-même au plan Pro
// après coup doit récupérer, sur SA PROPRE session, le palier déjà mérité par
// ses recommandations passées (US-10) — vérifié ici avec le vrai calcul de
// palier (ambassadorDiscountPercent), pas un pourcentage écrit à la main.
test('un ambassadeur qui passe au plan Pro après avoir déjà 2 filleuls reçoit sa session de checkout avec le coupon du bon palier', () => {
  const referralCountAtCheckoutTime = 2
  const discountPercent = ambassadorDiscountPercent(referralCountAtCheckoutTime)

  const ambassadorCheckoutParams = buildCheckoutSessionParams({
    userId: AMBASSADOR,
    email: 'ambassadeur@example.com',
    interval: 'year',
    existingCustomerId: null,
    appUrl: APP_URL,
    priceIds: PRICE_IDS,
    discountCouponId: `coupon_tier_${discountPercent}`,
  })

  assert.equal(discountPercent, 20)
  assert.deepEqual(ambassadorCheckoutParams.discounts, [{ coupon: 'coupon_tier_20' }])
  assert.equal(ambassadorCheckoutParams.line_items?.[0]?.price, PRICE_IDS.year)
})
