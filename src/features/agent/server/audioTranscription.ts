import { z } from 'zod'
import {
  audioTranscriptionMetadataSchema,
  audioTranscriptionResponseSchema,
  MAX_AUDIO_BYTES,
  type AudioTranscriptionMetadata,
  type AudioTranscriptionResponse,
} from '../schemas/audioTranscriptionSchema.ts'

export type AudioTranscriptionMode = 'mock' | 'real'

export interface AudioTranscriptionInput extends AudioTranscriptionMetadata {
  audio: Blob
}

export interface AudioTranscriptionDependencies {
  fetchImpl?: typeof fetch
  apiKey?: string
  model?: string
  mode?: AudioTranscriptionMode
}

const openAITranscriptionSchema = z.object({ text: z.string().trim().min(1) })

export function getAudioTranscriptionMode(value = process.env.AUDIO_TRANSCRIPTION_MODE): AudioTranscriptionMode {
  const mode = value ?? 'real'
  if (mode === 'mock' || mode === 'real') return mode
  throw new Error('INVALID_AUDIO_TRANSCRIPTION_MODE')
}

function validateAudioInput(input: AudioTranscriptionInput): AudioTranscriptionInput {
  const metadata = audioTranscriptionMetadataSchema.parse({
    mimeType: input.mimeType,
    durationMs: input.durationMs,
    language: input.language,
  })
  if (input.audio.size <= 0 || input.audio.size > MAX_AUDIO_BYTES) {
    throw new Error('INVALID_AUDIO_SIZE')
  }
  return { ...metadata, audio: input.audio }
}

export async function transcribeAudio(
  rawInput: AudioTranscriptionInput,
  dependencies: AudioTranscriptionDependencies = {}
): Promise<AudioTranscriptionResponse> {
  const input = validateAudioInput(rawInput)
  const mode = dependencies.mode ?? getAudioTranscriptionMode()

  if (mode === 'mock') {
    const mockText = {
      fr: 'Génère le PAT de Camille.',
      en: 'Generate the support plan for Camille.',
      es: 'Genera el PAT de Camila.',
    }[input.language]
    return audioTranscriptionResponseSchema.parse({ text: mockText })
  }

  const apiKey = dependencies.apiKey ?? process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('MISSING_GROQ_API_KEY')

  const formData = new FormData()
  formData.set('file', input.audio, `dictation.${input.mimeType === 'audio/mp4' ? 'm4a' : input.mimeType.slice(6)}`)
  formData.set(
    'model',
    dependencies.model ?? process.env.GROQ_TRANSCRIPTION_MODEL ?? 'whisper-large-v3-turbo'
  )
  formData.set('language', input.language)
  formData.set('response_format', 'json')

  const response = await (dependencies.fetchImpl ?? fetch)('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) throw new Error('AUDIO_PROVIDER_FAILED')
  const providerResult = openAITranscriptionSchema.parse(await response.json())
  return audioTranscriptionResponseSchema.parse({ text: providerResult.text })
}
