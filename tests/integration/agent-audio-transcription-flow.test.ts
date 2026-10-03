import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AudioTranscriptionError,
  orchestrateAudioTranscription,
} from '../../src/features/agent/server/audioTranscriptionOrchestration.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'

function validInput() {
  return {
    audio: new Blob(['audio-fictif'], { type: 'audio/webm' }),
    mimeType: 'audio/webm',
    durationMs: 3_000,
    language: 'fr' as const,
  }
}

test('dictée authentifiée : quota séparé débité une fois puis texte validé', async () => {
  let quotaCalls = 0
  let transcriptionCalls = 0
  const result = await orchestrateAudioTranscription(validInput(), USER_ID, {
    checkUsage: async (userId) => {
      assert.equal(userId, USER_ID)
      quotaCalls += 1
      return { allowed: true }
    },
    refundUsage: async () => 0,
    transcribeAudio: async (input) => {
      transcriptionCalls += 1
      assert.equal(input.language, 'fr')
      return { text: 'Ajoute une observation positive pour Camille.' }
    },
  })

  assert.equal(result.text, 'Ajoute une observation positive pour Camille.')
  assert.equal(quotaCalls, 1)
  assert.equal(transcriptionCalls, 1)
})

test('quota atteint : aucun audio n’est envoyé au fournisseur', async () => {
  let transcriptionCalls = 0
  await assert.rejects(
    orchestrateAudioTranscription(validInput(), USER_ID, {
      checkUsage: async () => ({ allowed: false }),
      refundUsage: async () => 0,
      transcribeAudio: async () => {
        transcriptionCalls += 1
        return { text: 'Ne doit pas arriver.' }
      },
    }),
    (error: unknown) => error instanceof AudioTranscriptionError && error.code === 'AUDIO_QUOTA_EXCEEDED'
  )
  assert.equal(transcriptionCalls, 0)
})

test('échec fournisseur : le quota audio est remboursé exactement une fois', async () => {
  let refunds = 0
  await assert.rejects(
    orchestrateAudioTranscription(validInput(), USER_ID, {
      checkUsage: async () => ({ allowed: true }),
      refundUsage: async (userId) => {
        assert.equal(userId, USER_ID)
        refunds += 1
      },
      transcribeAudio: async () => {
        throw new Error('Panne fictive')
      },
    }),
    (error: unknown) => error instanceof AudioTranscriptionError && error.code === 'AUDIO_TRANSCRIPTION_FAILED'
  )
  assert.equal(refunds, 1)
})

test('audio invalide : rejet avant quota et avant réseau', async () => {
  let quotaCalls = 0
  let transcriptionCalls = 0
  await assert.rejects(
    orchestrateAudioTranscription({ ...validInput(), durationMs: 91_000 }, USER_ID, {
      checkUsage: async () => {
        quotaCalls += 1
        return { allowed: true }
      },
      refundUsage: async () => 0,
      transcribeAudio: async () => {
        transcriptionCalls += 1
        return { text: 'Ne doit pas arriver.' }
      },
    }),
    (error: unknown) => error instanceof AudioTranscriptionError && error.code === 'INVALID_AUDIO'
  )
  assert.equal(quotaCalls, 0)
  assert.equal(transcriptionCalls, 0)
})
