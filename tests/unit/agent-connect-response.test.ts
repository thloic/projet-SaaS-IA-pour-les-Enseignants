import assert from 'node:assert/strict'
import test from 'node:test'

import { buildIntegrationConnectRequiredResponse } from '../../src/features/agent/server/agentResponses.ts'
import { agentStructuredResponseSchema } from '../../src/features/agent/schemas/agentSchema.ts'

test('carte de connexion Gmail en lecture : message FR par défaut', () => {
  const response = buildIntegrationConnectRequiredResponse('gmail_read', 'cherche le courriel de Léa')
  assert.equal(response.message, 'Pour chercher dans votre Gmail, connectez-le d’abord.')
  assert.equal(response.connectUrl, '/api/integrations/google/connect?feature=gmail_read')
  assert.equal(response.continuationText, 'cherche le courriel de Léa')
})

test('carte de connexion pour l’envoi Gmail : message dédié en FR, EN et ES', () => {
  assert.equal(
    buildIntegrationConnectRequiredResponse('gmail', 'x', 'fr').message,
    'Pour envoyer un courriel depuis votre Gmail, connectez-le d’abord.'
  )
  assert.equal(
    buildIntegrationConnectRequiredResponse('gmail', 'x', 'en').message,
    'To send an email from your Gmail, connect it first.'
  )
  assert.equal(
    buildIntegrationConnectRequiredResponse('gmail', 'x', 'es').message,
    'Para enviar un correo desde tu Gmail, primero debes conectarlo.'
  )
})

test('carte de connexion pour la recherche : messages EN et ES', () => {
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
  const response = buildIntegrationConnectRequiredResponse('gmail', 'envoie-le', 'fr')
  assert.equal(agentStructuredResponseSchema.safeParse(response).success, true)
})
