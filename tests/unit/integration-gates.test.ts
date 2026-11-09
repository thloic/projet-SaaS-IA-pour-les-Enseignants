import assert from 'node:assert/strict'
import test from 'node:test'
import { findMissingConnection } from '../../src/features/agent/server/integrationGates.ts'
import { isNeedsConnectionOutput } from '../../src/features/agent/server/needsConnection.ts'
import { GMAIL_READONLY_SCOPE } from '../../src/features/integrations/google/schemas/googleIntegrationSchema.ts'

const notConnected = async () => ({ connected: false, scopes: [] as string[] })
const connectedReadOnly = async () => ({ connected: true, scopes: [GMAIL_READONLY_SCOPE] })
const connectedOtherScope = async () => ({ connected: true, scopes: ['https://www.googleapis.com/auth/drive.file'] })

test('exige la connexion Gmail pour une recherche dans la boîte mail, si elle manque', async () => {
  const missing = await findMissingConnection('Cherche dans mon Gmail le dernier courriel de la direction', notConnected)
  assert.equal(missing, 'gmail_read')
})

test('ne bloque pas quand la connexion Gmail en lecture existe', async () => {
  const missing = await findMissingConnection('Cherche dans mon Gmail le dernier courriel de la direction', connectedReadOnly)
  assert.equal(missing, null)
})

test('bloque si la connexion existe mais sans le bon scope', async () => {
  const missing = await findMissingConnection('Cherche dans mon Gmail le dernier courriel de la direction', connectedOtherScope)
  assert.equal(missing, 'gmail_read')
})

test('ne lit pas le statut quand aucune règle ne correspond', async () => {
  let reads = 0
  const countingReader = async () => {
    reads += 1
    return { connected: false, scopes: [] as string[] }
  }
  const missing = await findMissingConnection('Génère un PAT pour Léa en mathématiques', countingReader)
  assert.equal(missing, null)
  assert.equal(reads, 0)
})

test('reconnaît uniquement les sorties d’outil « needs_connection » valides', () => {
  assert.equal(isNeedsConnectionOutput({ status: 'needs_connection', feature: 'gmail_read' }), true)
  assert.equal(isNeedsConnectionOutput({ status: 'needs_connection', feature: 'drive' }), true)
  assert.equal(isNeedsConnectionOutput({ status: 'needs_connection', feature: 'inconnu' }), false)
  assert.equal(isNeedsConnectionOutput({ status: 'ok', results: [] }), false)
  assert.equal(isNeedsConnectionOutput(null), false)
})
