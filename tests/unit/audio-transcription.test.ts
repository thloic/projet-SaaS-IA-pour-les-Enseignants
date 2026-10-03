import assert from 'node:assert/strict'
import test from 'node:test'

import {
  audioTranscriptionMetadataSchema,
  MAX_AUDIO_DURATION_MS,
} from '../../src/features/agent/schemas/audioTranscriptionSchema.ts'
import { transcribeAudio } from '../../src/features/agent/server/audioTranscription.ts'
import {
  getAudioFileExtension,
  composeVoiceDraft,
  mergeTranscript,
  selectSupportedRecorderMimeType,
} from '../../src/features/agent/utils/audioRecorder.ts'

function audioBlob(type = 'audio/webm') {
  return new Blob(['audio-fictif'], { type })
}

test('les métadonnées audio sont strictes, bornées et limitées aux formats acceptés', () => {
  assert.equal(audioTranscriptionMetadataSchema.safeParse({
    mimeType: 'audio/webm;codecs=opus',
    durationMs: MAX_AUDIO_DURATION_MS,
    language: 'fr',
  }).success, true)
  assert.equal(audioTranscriptionMetadataSchema.safeParse({
    mimeType: 'audio/webm',
    durationMs: MAX_AUDIO_DURATION_MS + 1,
    language: 'fr',
  }).success, false)
  assert.equal(audioTranscriptionMetadataSchema.safeParse({
    mimeType: 'video/mp4',
    durationMs: 1_000,
    language: 'fr',
  }).success, false)
  assert.equal(audioTranscriptionMetadataSchema.safeParse({
    mimeType: 'audio/webm',
    durationMs: 1_000,
    language: 'fr',
    userId: 'ne-doit-jamais-etre-accepte',
  }).success, false)
})

test('le navigateur choisit webm/opus puis mp4 et produit une extension cohérente', () => {
  assert.equal(selectSupportedRecorderMimeType((type) => type === 'audio/mp4'), 'audio/mp4')
  assert.equal(selectSupportedRecorderMimeType(() => false), undefined)
  assert.equal(getAudioFileExtension('audio/webm;codecs=opus'), 'webm')
  assert.equal(getAudioFileExtension('audio/mp4'), 'm4a')
})

test('la transcription complète le brouillon sans écraser le texte déjà saisi', () => {
  assert.equal(mergeTranscript('', ' Bonjour '), 'Bonjour')
  assert.equal(
    mergeTranscript('Génère un PAT pour', 'Camille à partir de ses observations.'),
    'Génère un PAT pour Camille à partir de ses observations.'
  )
})

test('la transcription finale remplace le texte provisoire sans le dupliquer', () => {
  const base = 'Ajoute une observation :'
  assert.equal(composeVoiceDraft(base, 'Jesse participe bien'), 'Ajoute une observation : Jesse participe bien')
  assert.equal(
    composeVoiceDraft(base, 'Jesse participe bien à l’oral.'),
    'Ajoute une observation : Jesse participe bien à l’oral.'
  )
})

test('le mode mock renvoie un contrat valide sans aucun appel réseau', async () => {
  let networkCalls = 0
  const result = await transcribeAudio(
    { audio: audioBlob(), mimeType: 'audio/webm', durationMs: 2_000, language: 'fr' },
    {
      mode: 'mock',
      fetchImpl: async () => {
        networkCalls += 1
        throw new Error('Aucun réseau attendu')
      },
    }
  )

  assert.equal(result.text, 'Génère le PAT de Camille.')
  assert.equal(networkCalls, 0)
})

test('le mode réel envoie un seul fichier borné et valide défensivement la réponse', async () => {
  let calls = 0
  const result = await transcribeAudio(
    { audio: audioBlob('audio/mp4'), mimeType: 'audio/mp4', durationMs: 4_000, language: 'es' },
    {
      mode: 'real',
      apiKey: 'cle-fictive',
      model: 'whisper-large-v3-turbo',
      fetchImpl: async (url, init) => {
        calls += 1
        assert.equal(url, 'https://api.groq.com/openai/v1/audio/transcriptions')
        assert.equal(init?.method, 'POST')
        assert.match(String((init?.headers as Record<string, string>).Authorization), /^Bearer /)
        const body = init?.body
        assert.ok(body instanceof FormData)
        assert.equal(body.get('model'), 'whisper-large-v3-turbo')
        assert.equal(body.get('language'), 'es')
        return Response.json({ text: 'Consulta la evolución de Camila.' })
      },
    }
  )

  assert.equal(calls, 1)
  assert.equal(result.text, 'Consulta la evolución de Camila.')

  await assert.rejects(
    transcribeAudio(
      { audio: audioBlob(), mimeType: 'audio/webm', durationMs: 2_000, language: 'fr' },
      {
        mode: 'real',
        apiKey: 'cle-fictive',
        fetchImpl: async () => Response.json({ transcript: 'mauvais contrat' }),
      }
    )
  )
})
