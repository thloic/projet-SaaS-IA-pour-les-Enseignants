import { NextResponse } from 'next/server'
import { checkAndIncrementUsage, decrementUsage } from '@/features/billing/server/usage'
import { getCurrentTeacherProfile, getCurrentUser } from '@/features/profile/server/profile'
import { transcribeAudio } from '@/features/agent/server/audioTranscription'
import {
  AudioTranscriptionError,
  orchestrateAudioTranscription,
} from '@/features/agent/server/audioTranscriptionOrchestration'
import { MAX_AUDIO_BYTES } from '@/features/agent/schemas/audioTranscriptionSchema'

export const runtime = 'nodejs'

const AUDIO_USAGE_FEATURE = 'agent_audio'

const COPY = {
  fr: {
    unauthorized: 'Vous devez être connecté pour utiliser la dictée.',
    invalid: 'L’enregistrement est vide, trop long ou dans un format non pris en charge.',
    quota: 'Vous avez atteint votre limite mensuelle de dictées.',
    failed: 'La transcription audio a échoué. Votre quota de dictées n’a pas été débité.',
  },
  en: {
    unauthorized: 'You must be signed in to use dictation.',
    invalid: 'The recording is empty, too long, or uses an unsupported format.',
    quota: 'You have reached your monthly dictation limit.',
    failed: 'Audio transcription failed. Your dictation quota was not charged.',
  },
  es: {
    unauthorized: 'Debes iniciar sesión para usar el dictado.',
    invalid: 'La grabación está vacía, es demasiado larga o usa un formato no compatible.',
    quota: 'Has alcanzado tu límite mensual de dictados.',
    failed: 'La transcripción de audio falló. No se descontó de tu cuota de dictados.',
  },
} as const

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return jsonError(COPY.fr.unauthorized, 401)

  const profile = await getCurrentTeacherProfile()
  const locale = profile?.interface_language ?? 'fr'
  const copy = COPY[locale]
  if (!profile) return jsonError(copy.unauthorized, 401)

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES + 64_000) {
    return jsonError(copy.invalid, 413)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return jsonError(copy.invalid, 400)
  }

  const audio = formData.get('audio')
  const durationMs = formData.get('durationMs')
  if (!(audio instanceof File) || typeof durationMs !== 'string') {
    return jsonError(copy.invalid, 400)
  }

  try {
    const result = await orchestrateAudioTranscription(
      {
        audio,
        mimeType: audio.type,
        durationMs: Number(durationMs),
        language: profile.language,
      },
      user.id,
      {
        checkUsage: (userId) => checkAndIncrementUsage(userId, AUDIO_USAGE_FEATURE),
        refundUsage: (userId) => decrementUsage(userId, AUDIO_USAGE_FEATURE),
        transcribeAudio,
      }
    )
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AudioTranscriptionError) {
      if (error.code === 'INVALID_AUDIO') return jsonError(copy.invalid, 400)
      if (error.code === 'AUDIO_QUOTA_EXCEEDED') return jsonError(copy.quota, 429)
    }
    return jsonError(copy.failed, 502)
  }
}
