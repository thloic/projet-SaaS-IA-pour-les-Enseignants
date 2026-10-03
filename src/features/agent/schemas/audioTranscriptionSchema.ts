import { z } from 'zod'

export const MAX_AUDIO_BYTES = 10 * 1024 * 1024
export const MAX_AUDIO_DURATION_MS = 90_000

export const supportedAudioMimeTypes = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
] as const

export type SupportedAudioMimeType = (typeof supportedAudioMimeTypes)[number]

export function normalizeAudioMimeType(value: string): string {
  return value.split(';', 1)[0]?.trim().toLowerCase() ?? ''
}

export const audioTranscriptionMetadataSchema = z
  .object({
    mimeType: z
      .string()
      .transform(normalizeAudioMimeType)
      .pipe(z.enum(supportedAudioMimeTypes)),
    durationMs: z.coerce.number().int().positive().max(MAX_AUDIO_DURATION_MS),
    language: z.enum(['fr', 'en', 'es']),
  })
  .strict()

export const audioTranscriptionResponseSchema = z
  .object({
    text: z.string().trim().min(1).max(12_000),
  })
  .strict()

export type AudioTranscriptionMetadata = z.infer<typeof audioTranscriptionMetadataSchema>
export type AudioTranscriptionResponse = z.infer<typeof audioTranscriptionResponseSchema>
