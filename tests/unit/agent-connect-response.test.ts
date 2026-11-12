import assert from 'node:assert/strict'
import test from 'node:test'

import { buildIntegrationConnectRequiredResponse } from '../../src/features/agent/server/agentResponses.ts'
import { agentStructuredResponseSchema } from '../../src/features/agent/schemas/agentSchema.ts'

test('carte de connexion Gmail : message FR par défaut', () => {
  const response = buildIntegrationConnectRequiredResponse('gmail', 'cherche le courriel de Léa')
  assert.equal(response.message, 'Pour accéder à votre Gmail (lecture et envoi), connectez-le d’abord.')
  assert.equal(response.connectUrl, '/api/integrations/google/connect?feature=gmail')
  assert.equal(response.continuationText, 'cherche le courriel de Léa')
})

test('carte de connexion Drive : messages EN et ES', () => {
  assert.equal(
    buildIntegrationConnectRequiredResponse('drive', 'x', 'en').message,
    'To access your Google Drive, connect it first.'
  )
  assert.equal(
    buildIntegrationConnectRequiredResponse('drive', 'x', 'es').message,
    'Para acceder a tu Google Drive, primero debes conectarlo.'
  )
})

test('la carte produite est valide contre le schéma de réponse de l’agent', () => {
  const response = buildIntegrationConnectRequiredResponse('drive', 'cherche', 'fr')
  assert.equal(agentStructuredResponseSchema.safeParse(response).success, true)
})
