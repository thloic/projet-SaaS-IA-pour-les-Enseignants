import assert from 'node:assert/strict'
import test from 'node:test'
import { findMissingConnection } from '../../src/features/agent/server/integrationGates.ts'
import { isNeedsConnectionOutput } from '../../src/features/agent/server/needsConnection.ts'
import {
  DRIVE_SCOPE,
  GMAIL_READONLY_SCOPE,
  GMAIL_SEND_SCOPE,
} from '../../src/features/integrations/google/schemas/googleIntegrationSchema.ts'

const notConnected = async () => ({ connected: false, scopes: [] as string[] })
const gmailOnlyReadScope = async () => ({ connected: true, scopes: [GMAIL_READONLY_SCOPE] })
const gmailComplete = async () => ({ connected: true, scopes: [GMAIL_READONLY_SCOPE, GMAIL_SEND_SCOPE] })
const driveComplete = async () => ({ connected: true, scopes: [DRIVE_SCOPE] })
const neverRead = async () => {
  throw new Error('statut non attendu')
}

test('exige la connexion Gmail pour une recherche dans la boîte mail, si elle manque', async () => {
  const missing = await findMissingConnection('Cherche dans mon Gmail le dernier courriel de la direction', notConnected)
  assert.equal(missing, 'gmail')
})

test('Gmail exige tous ses scopes : lecture seule ne suffit pas', async () => {
  const missing = await findMissingConnection('Cherche dans mon Gmail le dernier courriel', gmailOnlyReadScope)
  assert.equal(missing, 'gmail')
})

test('aucune carte quand Gmail est complet', async () => {
  const missing = await findMissingConnection('Cherche dans mon Gmail le dernier courriel', gmailComplete)
  assert.equal(missing, null)
})

test('exige la connexion Drive pour une demande de fichier Drive, si elle manque', async () => {
  const missing = await findMissingConnection('Modifie le gabarit de lettre dans mon Google Drive', notConnected)
  assert.equal(missing, 'drive')
})

test('aucune carte Drive quand Drive est connecté avec son scope complet', async () => {
  const missing = await findMissingConnection('Modifie le gabarit de lettre dans mon Google Drive', driveComplete)
  assert.equal(missing, null)
})

test('un message sans rapport ne lit jamais le statut', async () => {
  const missing = await findMissingConnection('Écris un commentaire de bulletin pour Léa en maths', neverRead)
  assert.equal(missing, null)
})

test('isNeedsConnectionOutput accepte gmail et drive, refuse les anciens noms', () => {
  assert.equal(isNeedsConnectionOutput({ status: 'needs_connection', feature: 'gmail' }), true)
  assert.equal(isNeedsConnectionOutput({ status: 'needs_connection', feature: 'drive' }), true)
  assert.equal(isNeedsConnectionOutput({ status: 'needs_connection', feature: 'gmail_read' }), false)
  assert.equal(isNeedsConnectionOutput({ status: 'ok' }), false)
})
