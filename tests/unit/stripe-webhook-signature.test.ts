import assert from 'node:assert/strict'
import test from 'node:test'
import Stripe from 'stripe'

// Ce test vérifie la vraie logique de vérification de signature du SDK Stripe
// (aucun appel réseau : generateTestHeaderString signe localement, comme le
// ferait Stripe côté serveur avant l'envoi du webhook).
const stripe = new Stripe('stripe_test_key_for_local_signature_only')
const WEBHOOK_SECRET = 'test_webhook_secret'

function signedHeader(payload: string, secret = WEBHOOK_SECRET) {
  return stripe.webhooks.generateTestHeaderString({ payload, secret })
}

test('une signature valide avec le bon secret est acceptée et l’événement est reconstruit', () => {
  const payload = JSON.stringify({ id: 'evt_123', type: 'checkout.session.completed', data: { object: {} } })
  const header = signedHeader(payload)

  const event = stripe.webhooks.constructEvent(payload, header, WEBHOOK_SECRET)
  assert.equal(event.id, 'evt_123')
  assert.equal(event.type, 'checkout.session.completed')
})

test('une signature générée avec un autre secret est rejetée', () => {
  const payload = JSON.stringify({ id: 'evt_123', type: 'checkout.session.completed', data: { object: {} } })
  const header = signedHeader(payload, 'different_test_webhook_secret')

  assert.throws(() => stripe.webhooks.constructEvent(payload, header, WEBHOOK_SECRET))
})

test('un payload modifié après signature (corps altéré) est rejeté', () => {
  const payload = JSON.stringify({ id: 'evt_123', type: 'checkout.session.completed', data: { object: {} } })
  const header = signedHeader(payload)
  const tamperedPayload = JSON.stringify({ id: 'evt_999', type: 'checkout.session.completed', data: { object: {} } })

  assert.throws(() => stripe.webhooks.constructEvent(tamperedPayload, header, WEBHOOK_SECRET))
})

test('un en-tête de signature vide ou absent est rejeté', () => {
  const payload = JSON.stringify({ id: 'evt_123', type: 'checkout.session.completed', data: { object: {} } })
  assert.throws(() => stripe.webhooks.constructEvent(payload, '', WEBHOOK_SECRET))
})
