import {
  audioTranscriptionMetadataSchema,
  MAX_AUDIO_BYTES,
  type AudioTranscriptionResponse,
} from '../schemas/audioTranscriptionSchema.ts'
import type { AudioTranscriptionInput } from './audioTranscription.ts'

export interface RawAudioTranscriptionInput {
  audio: Blob
  mimeType: string
  durationMs: unknown
  language: unknown
}

export class AudioTranscriptionError extends Error {
  readonly code: 'INVALID_AUDIO' | 'AUDIO_QUOTA_EXCEEDED' | 'AUDIO_TRANSCRIPTION_FAILED'

  constructor(code: 'INVALID_AUDIO' | 'AUDIO_QUOTA_EXCEEDED' | 'AUDIO_TRANSCRIPTION_FAILED') {
    super(code)
    this.code = code
  }
}

interface AudioTranscriptionOrchestrationDeps {
  checkUsage(userId: string): Promise<{ allowed: boolean }>
  refundUsage(userId: string): Promise<unknown>
  transcribeAudio(input: AudioTranscriptionInput): Promise<AudioTranscriptionResponse>
}

export async function orchestrateAudioTranscription(
  rawInput: RawAudioTranscriptionInput,
  trustedUserId: string,
  deps: AudioTranscriptionOrchestrationDeps
): Promise<AudioTranscriptionResponse> {
  const metadata = audioTranscriptionMetadataSchema.safeParse({
    mimeType: rawInput.mimeType,
    durationMs: rawInput.durationMs,
    language: rawInput.language,
  })
  if (!metadata.success || rawInput.audio.size <= 0 || rawInput.audio.size > MAX_AUDIO_BYTES) {
    throw new AudioTranscriptionError('INVALID_AUDIO')
  }

  const usage = await deps.checkUsage(trustedUserId)
  if (!usage.allowed) throw new AudioTranscriptionError('AUDIO_QUOTA_EXCEEDED')

  try {
    return await deps.transcribeAudio({ ...metadata.data, audio: rawInput.audio })
  } catch {
    try {
      await deps.refundUsage(trustedUserId)
    } catch {
      // Le problème de remboursement ne doit jamais masquer l'erreur de transcription.
    }
    throw new AudioTranscriptionError('AUDIO_TRANSCRIPTION_FAILED')
  }
}
