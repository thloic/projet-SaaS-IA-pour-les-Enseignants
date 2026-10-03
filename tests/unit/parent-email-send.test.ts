import assert from 'node:assert/strict'
import test from 'node:test'

import {
  orchestrateParentEmailSend,
  ParentEmailSendOrchestrationError,
} from '../../src/features/agent/server/parentEmailSendOrchestration.ts'
import { GoogleAccessTokenError } from '../../src/features/integrations/google/server/googleAccessToken.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const DRAFT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

function baseInput(overrides: Partial<Parameters<typeof orchestrateParentEmailSend>[0]> = {}) {
  return {
    draftId: DRAFT_ID,
    userId: USER_ID,
    to: 'parent@example.com',
    subject: 'Sujet du courriel',
    body: 'Corps du courriel suffisamment long pour être valide.',
    ...overrides,
  }
}

function baseDependencies(overrides: Partial<Parameters<typeof orchestrateParentEmailSend>[1]> = {}) {
  return {
    getAccessToken: async () => 'valid-access-token',
    sendGmailMessage: async () => ({ messageId: 'msg-1' }),
    markDraftSent: async () => {},
    checkUsage: async () => ({ allowed: true }),
    refundUsage: async () => 0,
    ...overrides,
  }
}

test('adresse de destination invalide : rejetée avant tout appel de quota', async () => {
  let usageCalls = 0

  await assert.rejects(() =>
    orchestrateParentEmailSend(
      baseInput({ to: 'pas-un-email' }),
      baseDependencies({ checkUsage: async () => { usageCalls += 1; return { allowed: true } } })
    )
  )

  assert.equal(usageCalls, 0)
})

test('quota dépassé : aucun jeton récupéré, aucun envoi tenté', async () => {
  let tokenCalls = 0
  let sendCalls = 0

  await assert.rejects(
    () =>
      orchestrateParentEmailSend(
        baseInput(),
        baseDependencies({
          checkUsage: async () => ({ allowed: false }),
          getAccessToken: async () => { tokenCalls += 1; return 'token' },
          sendGmailMessage: async () => { sendCalls += 1; return { messageId: 'x' } },
        })
      ),
    (error: unknown) =>
      error instanceof ParentEmailSendOrchestrationError && error.code === 'PARENT_EMAIL_SEND_QUOTA_EXCEEDED'
  )

  assert.equal(tokenCalls, 0)
  assert.equal(sendCalls, 0)
})

test('Gmail non connecté : erreur dédiée, quota remboursé, aucun envoi tenté', async () => {
  let refundCalls = 0
  let sendCalls = 0

  await assert.rejects(
    () =>
      orchestrateParentEmailSend(
        baseInput(),
        baseDependencies({
          getAccessToken: async () => {
            throw new GoogleAccessTokenError('GOOGLE_NOT_CONNECTED')
          },
          sendGmailMessage: async () => { sendCalls += 1; return { messageId: 'x' } },
          refundUsage: async () => { refundCalls += 1 },
        })
      ),
    (error: unknown) =>
      error instanceof ParentEmailSendOrchestrationError && error.code === 'GOOGLE_NOT_CONNECTED'
  )

  assert.equal(refundCalls, 1)
  assert.equal(sendCalls, 0)
})

test('scope Gmail manquant (Drive connecté mais pas Gmail) : erreur dédiée', async () => {
  await assert.rejects(
    () =>
      orchestrateParentEmailSend(
        baseInput(),
        baseDependencies({
          getAccessToken: async () => {
            throw new GoogleAccessTokenError('GOOGLE_SCOPE_MISSING')
          },
        })
      ),
    (error: unknown) =>
      error instanceof ParentEmailSendOrchestrationError && error.code === 'GOOGLE_SCOPE_MISSING'
  )
})

test('échec d’envoi Gmail : remboursement exactement une fois, brouillon non marqué envoyé', async () => {
  let refundCalls = 0
  let markSentCalls = 0

  await assert.rejects(
    () =>
      orchestrateParentEmailSend(
        baseInput(),
        baseDependencies({
          sendGmailMessage: async () => {
            throw new Error('échec simulé')
          },
          markDraftSent: async () => { markSentCalls += 1 },
          refundUsage: async () => { refundCalls += 1 },
        })
      ),
    (error: unknown) =>
      error instanceof ParentEmailSendOrchestrationError && error.code === 'PARENT_EMAIL_SEND_FAILED'
  )

  assert.equal(refundCalls, 1)
  assert.equal(markSentCalls, 0)
})

test('envoi réussi : jeton transmis au message, brouillon marqué envoyé avec la bonne adresse, une seule charge de quota', async () => {
  let usageCalls = 0
  let receivedMessage: { accessToken: string; to: string; subject: string; body: string } | null = null
  let markedSent: { draftId: string; userId: string; sentTo: string } | null = null

  const result = await orchestrateParentEmailSend(
    baseInput(),
    baseDependencies({
      checkUsage: async () => { usageCalls += 1; return { allowed: true } },
      getAccessToken: async () => 'token-abc',
      sendGmailMessage: async (input) => {
        receivedMessage = input
        return { messageId: 'msg-42' }
      },
      markDraftSent: async (input) => {
        markedSent = input
      },
    })
  )

  assert.deepEqual(result, { messageId: 'msg-42' })
  assert.equal(usageCalls, 1)
  assert.deepEqual(receivedMessage, {
    accessToken: 'token-abc',
    to: 'parent@example.com',
    subject: 'Sujet du courriel',
    body: 'Corps du courriel suffisamment long pour être valide.',
  })
  assert.deepEqual(markedSent, {
    draftId: DRAFT_ID,
    userId: USER_ID,
    sentTo: 'parent@example.com',
  })
})
