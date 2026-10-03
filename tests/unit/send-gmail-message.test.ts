import assert from 'node:assert/strict'
import test from 'node:test'

import { buildRawMimeMessage } from '../../src/features/integrations/google/server/gmailMimeMessage.ts'
import {
  getGoogleIntegrationsMode,
  sendGmailMessage,
} from '../../src/features/integrations/google/server/sendGmailMessage.ts'

test('buildRawMimeMessage produit un base64url décodable contenant le destinataire et le corps', () => {
  const raw = buildRawMimeMessage({
    to: 'parent@example.com',
    subject: 'Sujet accentué',
    body: 'Corps du message avec des accents : élève, à, ça.',
  })

  assert.doesNotMatch(raw, /[+/=]/)
  const decoded = Buffer.from(raw, 'base64').toString('utf-8')
  assert.match(decoded, /To: parent@example\.com/)
  assert.match(decoded, /Corps du message avec des accents : élève, à, ça\./)
})

test('getGoogleIntegrationsMode rejette un mode invalide', () => {
  const previousMode = process.env.GOOGLE_INTEGRATIONS_MODE
  process.env.GOOGLE_INTEGRATIONS_MODE = 'invalide'
  try {
    assert.throws(() => getGoogleIntegrationsMode())
  } finally {
    if (previousMode === undefined) delete process.env.GOOGLE_INTEGRATIONS_MODE
    else process.env.GOOGLE_INTEGRATIONS_MODE = previousMode
  }
})

test('sendGmailMessage en mode mock renvoie un identifiant sans appel réseau', async () => {
  const previousMode = process.env.GOOGLE_INTEGRATIONS_MODE
  process.env.GOOGLE_INTEGRATIONS_MODE = 'mock'
  try {
    const result = await sendGmailMessage({
      accessToken: 'fake',
      to: 'parent@example.com',
      subject: 'Sujet',
      body: 'Corps du message.',
    })
    assert.match(result.messageId, /^mock-/)
  } finally {
    if (previousMode === undefined) delete process.env.GOOGLE_INTEGRATIONS_MODE
    else process.env.GOOGLE_INTEGRATIONS_MODE = previousMode
  }
})
