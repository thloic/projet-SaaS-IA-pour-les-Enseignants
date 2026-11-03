import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCheckoutSessionParams } from '../../src/features/billing/server/checkoutCore.ts'
import { checkoutInputSchema } from '../../src/features/billing/schemas/billingSchema.ts'

const USER_A = '11111111-1111-4111-8111-111111111111'
const PRICE_ID = 'price_participation_monthly_123'
const BASE_INPUT = {
  userId: USER_A,
  email: 'prof@example.com',
  existingCustomerId: null,
  appUrl: 'https://educassist.example.com',
  priceId: PRICE_ID,
}

test('la participation utilise uniquement le price_id mensuel configuré côté serveur', () => {
  const params = buildCheckoutSessionParams(BASE_INPUT)
  assert.equal(params.line_items?.[0]?.price, PRICE_ID)
  assert.equal(params.subscription_data?.metadata?.membership_type, 'participation')
})

test('mode abonnement, quantité 1', () => {
  const params = buildCheckoutSessionParams(BASE_INPUT)
  assert.equal(params.mode, 'subscription')
  assert.equal(params.line_items?.[0]?.quantity, 1)
})

test('lie la session à l’utilisateur via client_reference_id et via les metadata de l’abonnement (redondance volontaire)', () => {
  const params = buildCheckoutSessionParams(BASE_INPUT)
  assert.equal(params.client_reference_id, USER_A)
  assert.equal(params.subscription_data?.metadata?.supabase_user_id, USER_A)
})

test('urls de succès et d’annulation construites à partir de appUrl', () => {
  const params = buildCheckoutSessionParams(BASE_INPUT)
  assert.equal(params.success_url, 'https://educassist.example.com/settings?checkout=success')
  assert.equal(params.cancel_url, 'https://educassist.example.com/settings?checkout=cancelled')
})

test('réutilise un client Stripe existant plutôt que d’en recréer un', () => {
  const params = buildCheckoutSessionParams({
    ...BASE_INPUT,
    existingCustomerId: 'cus_existing_789',
  })
  assert.equal(params.customer, 'cus_existing_789')
  assert.equal(params.customer_email, undefined)
})

test('sans client existant, utilise customer_email pour laisser Stripe en créer un', () => {
  const params = buildCheckoutSessionParams(BASE_INPUT)
  assert.equal(params.customer_email, 'prof@example.com')
  assert.equal(params.customer, undefined)
})

test('un price_id mensuel manquant lève une erreur explicite plutôt que d’envoyer une session invalide à Stripe', () => {
  assert.throws(() =>
    buildCheckoutSessionParams({
      ...BASE_INPUT,
      priceId: '',
    })
  )
})

test('le schéma de checkout refuse qu’un client choisisse un intervalle ou un prix', () => {
  assert.equal(checkoutInputSchema.safeParse({}).success, true)
  assert.equal(checkoutInputSchema.safeParse({ interval: 'year' }).success, false)
  assert.equal(checkoutInputSchema.safeParse({ priceId: 'price_forged' }).success, false)
})

test('un ambassadorUserId fourni est propagé dans les metadata de l’abonnement, pour que le webhook puisse enregistrer la recommandation', () => {
  const params = buildCheckoutSessionParams({
    ...BASE_INPUT,
    ambassadorUserId: 'ambassador-user-id',
  })
  assert.equal(params.subscription_data?.metadata?.ambassador_user_id, 'ambassador-user-id')
})

test('sans ambassadorUserId, aucune clé ambassador_user_id n’est ajoutée aux metadata', () => {
  const params = buildCheckoutSessionParams(BASE_INPUT)
  assert.equal(params.subscription_data?.metadata?.ambassador_user_id, undefined)
})

test('un discountCouponId fourni (palier de réduction de l’ambassadeur qui s’abonne) applique le coupon à sa propre session', () => {
  const params = buildCheckoutSessionParams({
    ...BASE_INPUT,
    discountCouponId: 'coupon_20',
  })
  assert.deepEqual(params.discounts, [{ coupon: 'coupon_20' }])
})

test('sans discountCouponId (aucun filleul recommandé), aucun rabais n’est appliqué', () => {
  const params = buildCheckoutSessionParams(BASE_INPUT)
  assert.equal(params.discounts, undefined)
})
