import assert from 'node:assert/strict'
import test from 'node:test'

import { buildIntegrationConnectRequiredResponse } from '../../src/features/agent/server/agentResponses.ts'
import { agentStructuredResponseSchema } from '../../src/features/agent/schemas/agentSchema.ts'

test('carte de connexion Gmail : message FR par défaut', () => {
  const response = buildIntegrationConnectRequiredResponse('gmail_read', 'cherche le courriel de Léa')
  assert.equal(response.message, 'Pour chercher dans votre Gmail, connectez-le d’abord.')
  assert.equal(response.connectUrl, '/api/integrations/google/connect?feature=gmail_read')
  assert.equal(response.continuationText, 'cherche le courriel de Léa')
})

test('carte de connexion Gmail : messages EN et ES', () => {
  assert.equal(
    buildIntegrationConnectRequiredResponse('gmail_read', 'x', 'en').message,
    'To search your Gmail, connect it first.'
  )
  assert.equal(
    buildIntegrationConnectRequiredResponse('gmail_read', 'x', 'es').message,
    'Para buscar en tu Gmail, primero debes conectarlo.'
  )
})

test('la carte produite est valide contre le schéma de réponse de l’agent', () => {
  const response = buildIntegrationConnectRequiredResponse('gmail_read', 'cherche', 'fr')
  assert.equal(agentStructuredResponseSchema.safeParse(response).success, true)
})
