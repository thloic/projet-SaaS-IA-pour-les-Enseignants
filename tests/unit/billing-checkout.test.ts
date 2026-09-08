import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCheckoutSessionParams } from '../../src/features/billing/server/checkoutCore.ts'

const USER_A = '11111111-1111-4111-8111-111111111111'
const PRICE_IDS = { month: 'price_month_123', year: 'price_year_456' }
const BASE_INPUT = {
  userId: USER_A,
  email: 'prof@example.com',
  existingCustomerId: null,
  appUrl: 'https://educassist.example.com',
  priceIds: PRICE_IDS,
}

test('mensuel utilise le price_id mensuel', () => {
  const params = buildCheckoutSessionParams({ ...BASE_INPUT, interval: 'month' })
  assert.equal(params.line_items?.[0]?.price, PRICE_IDS.month)
})

test('annuel utilise le price_id annuel', () => {
  const params = buildCheckoutSessionParams({ ...BASE_INPUT, interval: 'year' })
  assert.equal(params.line_items?.[0]?.price, PRICE_IDS.year)
})

test('mode abonnement, quantité 1', () => {
  const params = buildCheckoutSessionParams({ ...BASE_INPUT, interval: 'month' })
  assert.equal(params.mode, 'subscription')
  assert.equal(params.line_items?.[0]?.quantity, 1)
})

test('lie la session à l’utilisateur via client_reference_id et via les metadata de l’abonnement (redondance volontaire)', () => {
  const params = buildCheckoutSessionParams({ ...BASE_INPUT, interval: 'month' })
  assert.equal(params.client_reference_id, USER_A)
  assert.equal(params.subscription_data?.metadata?.supabase_user_id, USER_A)
})

test('urls de succès et d’annulation construites à partir de appUrl', () => {
  const params = buildCheckoutSessionParams({ ...BASE_INPUT, interval: 'month' })
  assert.equal(params.success_url, 'https://educassist.example.com/settings?checkout=success')
  assert.equal(params.cancel_url, 'https://educassist.example.com/settings?checkout=cancelled')
})

test('réutilise un client Stripe existant plutôt que d’en recréer un', () => {
  const params = buildCheckoutSessionParams({
    ...BASE_INPUT,
    interval: 'month',
    existingCustomerId: 'cus_existing_789',
  })
  assert.equal(params.customer, 'cus_existing_789')
  assert.equal(params.customer_email, undefined)
})

test('sans client existant, utilise customer_email pour laisser Stripe en créer un', () => {
  const params = buildCheckoutSessionParams({ ...BASE_INPUT, interval: 'month' })
  assert.equal(params.customer_email, 'prof@example.com')
  assert.equal(params.customer, undefined)
})

test('un price_id manquant pour l’intervalle demandé lève une erreur explicite plutôt que d’envoyer une session invalide à Stripe', () => {
  assert.throws(() =>
    buildCheckoutSessionParams({
      ...BASE_INPUT,
      interval: 'month',
      priceIds: { month: '', year: PRICE_IDS.year },
    })
  )
})

test('un ambassadorUserId fourni est propagé dans les metadata de l’abonnement, pour que le webhook puisse enregistrer la recommandation', () => {
  const params = buildCheckoutSessionParams({
    ...BASE_INPUT,
    interval: 'month',
    ambassadorUserId: 'ambassador-user-id',
  })
  assert.equal(params.subscription_data?.metadata?.ambassador_user_id, 'ambassador-user-id')
})

test('sans ambassadorUserId, aucune clé ambassador_user_id n’est ajoutée aux metadata', () => {
  const params = buildCheckoutSessionParams({ ...BASE_INPUT, interval: 'month' })
  assert.equal(params.subscription_data?.metadata?.ambassador_user_id, undefined)
})

test('un discountCouponId fourni (palier de réduction de l’ambassadeur qui s’abonne) applique le coupon à sa propre session', () => {
  const params = buildCheckoutSessionParams({
    ...BASE_INPUT,
    interval: 'month',
    discountCouponId: 'coupon_20',
  })
  assert.deepEqual(params.discounts, [{ coupon: 'coupon_20' }])
})

test('sans discountCouponId (aucun filleul recommandé), aucun rabais n’est appliqué', () => {
  const params = buildCheckoutSessionParams({ ...BASE_INPUT, interval: 'month' })
  assert.equal(params.discounts, undefined)
})
