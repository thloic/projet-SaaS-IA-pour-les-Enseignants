import assert from 'node:assert/strict'
import test from 'node:test'

import { orchestrateParentEmailSend } from '../../src/features/agent/server/parentEmailSendOrchestration.ts'
import { getValidGoogleAccessToken } from '../../src/features/integrations/google/server/googleAccessToken.ts'
import { GMAIL_SEND_SCOPE } from '../../src/features/integrations/google/schemas/googleIntegrationSchema.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const DRAFT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

// Simule la chaine complete, du bouton "Envoyer" jusqu'au marquage "envoye" en
// base, avec un faux magasin Google + un faux magasin de brouillons en
// memoire — sans toucher Supabase ni l'API Gmail reelle (meme discipline
// d'integration que tests/integration/agent-audio-transcription-flow.test.ts).
function createFakeGoogleStore() {
  const connections = new Map<
    string,
    { scopes: string[]; accessToken: string; refreshToken: string; expiresAt: string }
  >()

  return {
    connect(userId: string, scopes: string[], accessToken: string, expiresAt: string) {
      connections.set(userId, { scopes, accessToken, refreshToken: `refresh-${userId}`, expiresAt })
    },
    getCredentials: async (userId: string) => connections.get(userId) ?? null,
    refreshAccessToken: async (refreshToken: string) => {
      assert.equal(refreshToken, `refresh-${USER_ID}`)
      return { accessToken: 'refreshed-access-token', expiresAt: '2026-01-01T13:00:00.000Z' }
    },
    saveRefreshedToken: async (userId: string, accessToken: string, expiresAt: string) => {
      const existing = connections.get(userId)
      if (existing) connections.set(userId, { ...existing, accessToken, expiresAt })
    },
  }
}

function createFakeDraftStore() {
  const drafts = new Map<string, { sentAt: string | null; sentTo: string | null }>()
  drafts.set(DRAFT_ID, { sentAt: null, sentTo: null })

  return {
    drafts,
    markDraftSent: async (input: { draftId: string; userId: string; sentTo: string }) => {
      drafts.set(input.draftId, { sentAt: new Date().toISOString(), sentTo: input.sentTo })
    },
  }
}

test('Gmail jamais connecté : envoi refusé, quota débité puis remboursé, brouillon jamais marqué envoyé', async () => {
  const googleStore = createFakeGoogleStore()
  const draftStore = createFakeDraftStore()
  let usageUsed = 0

  await assert.rejects(() =>
    orchestrateParentEmailSend(
      { draftId: DRAFT_ID, userId: USER_ID, to: 'parent@example.com', subject: 'Sujet', body: 'Corps suffisamment long.' },
      {
        getAccessToken: (userId) => getValidGoogleAccessToken(userId, GMAIL_SEND_SCOPE, googleStore),
        sendGmailMessage: async () => ({ messageId: 'ne-devrait-jamais-etre-appele' }),
        markDraftSent: draftStore.markDraftSent,
        checkUsage: async () => { usageUsed += 1; return { allowed: true } },
        refundUsage: async () => { usageUsed -= 1 },
      }
    )
  )

  assert.equal(usageUsed, 0)
  assert.equal(draftStore.drafts.get(DRAFT_ID)?.sentAt, null)
})

test('Gmail connecté avec un jeton expiré : rafraîchissement transparent puis envoi et marquage réussis', async () => {
  const googleStore = createFakeGoogleStore()
  googleStore.connect(USER_ID, [GMAIL_SEND_SCOPE], 'expired-token', '2026-01-01T00:00:00.000Z')
  const draftStore = createFakeDraftStore()
  const sentMessages: { accessToken: string; to: string }[] = []

  const result = await orchestrateParentEmailSend(
    { draftId: DRAFT_ID, userId: USER_ID, to: 'parent@example.com', subject: 'Sujet', body: 'Corps suffisamment long.' },
    {
      getAccessToken: (userId) => getValidGoogleAccessToken(userId, GMAIL_SEND_SCOPE, googleStore),
      sendGmailMessage: async (input) => {
        sentMessages.push({ accessToken: input.accessToken, to: input.to })
        return { messageId: 'msg-integration-1' }
      },
      markDraftSent: draftStore.markDraftSent,
      checkUsage: async () => ({ allowed: true }),
      refundUsage: async () => 0,
    }
  )

  assert.deepEqual(result, { messageId: 'msg-integration-1' })
  assert.equal(sentMessages[0]?.accessToken, 'refreshed-access-token')
  assert.equal(draftStore.drafts.get(DRAFT_ID)?.sentTo, 'parent@example.com')
  assert.notEqual(draftStore.drafts.get(DRAFT_ID)?.sentAt, null)
})
