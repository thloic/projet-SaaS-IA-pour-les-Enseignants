import assert from 'node:assert/strict'
import test from 'node:test'

import { parentEmailDraftSchema } from '../../src/features/agent/schemas/parentEmailSchema.ts'
import { parentEmailTranslationMock } from '../../src/features/agent/mocks/parentEmailTranslationMock.ts'
import {
  getParentEmailTranslationMode,
  translateParentEmailDraft,
  translateRealParentEmailDraft,
} from '../../src/features/agent/server/generateParentEmailTranslation.ts'
import {
  ParentEmailTranslationOrchestrationError,
  orchestrateParentEmailTranslation,
} from '../../src/features/agent/server/parentEmailTranslationOrchestration.ts'
import { buildParentEmailTranslationPrompt } from '../../src/features/agent/server/parentEmailTranslationPrompt.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'

test('parentEmailTranslationMock respecte le schéma de sortie final', () => {
  assert.doesNotThrow(() => parentEmailDraftSchema.parse(parentEmailTranslationMock))
})

test('buildParentEmailTranslationPrompt exige une traduction fidèle, sans reformulation', () => {
  const prompt = buildParentEmailTranslationPrompt({
    subject: 'Sujet source',
    body: 'Corps source',
    targetLanguage: 'anglais',
  })
  assert.match(prompt, /anglais/)
  assert.match(prompt, /ne reformule pas/)
  assert.match(prompt, /Sujet source/)
  assert.match(prompt, /Corps source/)
})

test('translateRealParentEmailDraft valide la sortie du générateur contre le schéma final', async () => {
  const translatedBody =
    'Cuerpo del mensaje traducido con suficiente longitud para ser considerado un correo completo y válido.'
  const draft = await translateRealParentEmailDraft(
    { subject: 'Sujet', body: 'Corps', targetLanguage: 'espagnol' },
    async () => ({ subject: 'Asunto', body: translatedBody })
  )
  assert.deepEqual(draft, { subject: 'Asunto', body: translatedBody })

  await assert.rejects(() =>
    translateRealParentEmailDraft(
      { subject: 'Sujet', body: 'Corps', targetLanguage: 'espagnol' },
      async () => ({ subject: '', body: '' })
    )
  )
})

test('generateParentEmailTranslation (mock-as-contract) : mode mock ignore le générateur réel', async () => {
  const previousMode = process.env.PARENT_EMAIL_TRANSLATION_MODE
  process.env.PARENT_EMAIL_TRANSLATION_MODE = 'mock'

  try {
    const draft = await translateParentEmailDraft({
      subject: 'Sujet',
      body: 'Corps',
      targetLanguage: 'anglais',
    })
    assert.deepEqual(draft, parentEmailTranslationMock)
  } finally {
    if (previousMode === undefined) delete process.env.PARENT_EMAIL_TRANSLATION_MODE
    else process.env.PARENT_EMAIL_TRANSLATION_MODE = previousMode
  }
})

test('getParentEmailTranslationMode rejette un mode de génération invalide', () => {
  const previousMode = process.env.PARENT_EMAIL_TRANSLATION_MODE
  process.env.PARENT_EMAIL_TRANSLATION_MODE = 'invalide'
  try {
    assert.throws(() => getParentEmailTranslationMode())
  } finally {
    if (previousMode === undefined) delete process.env.PARENT_EMAIL_TRANSLATION_MODE
    else process.env.PARENT_EMAIL_TRANSLATION_MODE = previousMode
  }
})

function baseDependencies(overrides: Partial<Parameters<typeof orchestrateParentEmailTranslation>[1]> = {}) {
  return {
    translateParentEmailDraft: async () => ({
      subject: 'Translated subject',
      body: 'Translated body long enough to be valid.',
    }),
    checkUsage: async () => ({ allowed: true }),
    refundUsage: async () => 0,
    ...overrides,
  }
}

test('orchestrateParentEmailTranslation : quota dépassé, aucune traduction tentée', async () => {
  let translationCalls = 0

  await assert.rejects(
    () =>
      orchestrateParentEmailTranslation(
        { subject: 'Sujet', body: 'Corps', targetLanguage: 'anglais', trustedUserId: USER_ID },
        baseDependencies({
          checkUsage: async () => ({ allowed: false }),
          translateParentEmailDraft: async () => {
            translationCalls += 1
            return { subject: 'x', body: 'x'.repeat(90) }
          },
        })
      ),
    (error: unknown) =>
      error instanceof ParentEmailTranslationOrchestrationError &&
      error.code === 'PARENT_EMAIL_TRANSLATION_QUOTA_EXCEEDED'
  )

  assert.equal(translationCalls, 0)
})

test('orchestrateParentEmailTranslation : échec de traduction, remboursement exactement une fois', async () => {
  let refundCalls = 0
  let usageCalls = 0

  await assert.rejects(
    () =>
      orchestrateParentEmailTranslation(
        { subject: 'Sujet', body: 'Corps', targetLanguage: 'anglais', trustedUserId: USER_ID },
        baseDependencies({
          checkUsage: async () => {
            usageCalls += 1
            return { allowed: true }
          },
          translateParentEmailDraft: async () => {
            throw new Error('échec simulé')
          },
          refundUsage: async () => {
            refundCalls += 1
          },
        })
      ),
    (error: unknown) =>
      error instanceof ParentEmailTranslationOrchestrationError &&
      error.code === 'PARENT_EMAIL_TRANSLATION_FAILED'
  )

  assert.equal(usageCalls, 1)
  assert.equal(refundCalls, 1)
})

test('orchestrateParentEmailTranslation : succès, le texte source est transmis tel quel au traducteur', async () => {
  let receivedInput: { subject: string; body: string; targetLanguage: string } | null = null

  const result = await orchestrateParentEmailTranslation(
    { subject: 'Sujet retouché', body: 'Corps retouché par l’enseignant', targetLanguage: 'créole haïtien', trustedUserId: USER_ID },
    baseDependencies({
      translateParentEmailDraft: async (input) => {
        receivedInput = input
        return { subject: 'Sijè tradui', body: 'Kò mesaj la tradui ase lontan pou valab.' }
      },
    })
  )

  assert.deepEqual(result, { subject: 'Sijè tradui', body: 'Kò mesaj la tradui ase lontan pou valab.' })
  assert.deepEqual(receivedInput, {
    subject: 'Sujet retouché',
    body: 'Corps retouché par l’enseignant',
    targetLanguage: 'créole haïtien',
  })
})

test('orchestrateParentEmailTranslation : rejette une langue cible vide avant tout appel de quota', async () => {
  let usageCalls = 0

  await assert.rejects(() =>
    orchestrateParentEmailTranslation(
      { subject: 'Sujet', body: 'Corps', targetLanguage: '  ', trustedUserId: USER_ID },
      baseDependencies({ checkUsage: async () => { usageCalls += 1; return { allowed: true } } })
    )
  )

  assert.equal(usageCalls, 0)
})
