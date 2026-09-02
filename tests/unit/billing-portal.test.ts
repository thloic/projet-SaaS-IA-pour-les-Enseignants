import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPortalSessionParams } from '../../src/features/billing/server/portalCore.ts'

test('construit une session de portail pour un client Stripe existant', () => {
  const params = buildPortalSessionParams({
    stripeCustomerId: 'cus_123',
    appUrl: 'https://educassist.example.com',
  })
  assert.equal(params.customer, 'cus_123')
  assert.equal(params.return_url, 'https://educassist.example.com/settings')
})

test('un enseignant qui n’a jamais souscrit (aucun stripe_customer_id) ne peut pas ouvrir le portail — erreur explicite plutôt qu’un appel Stripe voué à l’échec', () => {
  assert.throws(() => buildPortalSessionParams({ stripeCustomerId: null, appUrl: 'https://educassist.example.com' }))
})
