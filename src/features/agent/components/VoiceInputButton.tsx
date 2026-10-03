'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Mic, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/shared/ToastProvider'
import { useAudioRecorder } from '@/features/agent/hooks/useAudioRecorder'
import { useLiveSpeechRecognition } from '@/features/agent/hooks/useLiveSpeechRecognition'
import { voiceInputTranslations } from '@/features/agent/i18n/voiceInputTranslations'
import { audioTranscriptionResponseSchema } from '@/features/agent/schemas/audioTranscriptionSchema'
import { getAudioFileExtension } from '@/features/agent/utils/audioRecorder'
import type { AppLocale } from '@/features/i18n/locale'

interface VoiceInputButtonProps {
  locale: AppLocale
  disabled?: boolean
  onTranscript: (text: string) => void
  onLiveTranscript?: (text: string) => void
  onDictationStart?: () => void
  onDictationCancel?: () => void
  onBusyChange?: (busy: boolean) => void
}

export default function VoiceInputButton({
  locale,
  disabled = false,
  onTranscript,
  onLiveTranscript,
  onDictationStart,
  onDictationCancel,
  onBusyChange,
}: VoiceInputButtonProps) {
  const copy = voiceInputTranslations[locale]
  const { showToast } = useToast()
  const [isTranscribing, setIsTranscribing] = useState(false)

  const reportError = useCallback((error: Error) => {
    const message = error.message === 'AUDIO_RECORDING_UNSUPPORTED' ? copy.unsupported : copy.failed
    showToast(message, 'error')
  }, [copy.failed, copy.unsupported, showToast])

  const transcribe = useCallback(async ({ blob, durationMs }: { blob: Blob; durationMs: number }) => {
    setIsTranscribing(true)
    try {
      const extension = getAudioFileExtension(blob.type)
      const formData = new FormData()
      formData.set('audio', blob, `dictation.${extension}`)
      formData.set('durationMs', String(durationMs))

      const response = await fetch('/api/agent/transcribe', { method: 'POST', body: formData })
      const body: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
            ? body.error
            : copy.failed
        throw new Error(message)
      }

      const parsed = audioTranscriptionResponseSchema.safeParse(body)
      if (!parsed.success) throw new Error(copy.failed)
      onTranscript(parsed.data.text)
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.failed
      showToast(message, 'error')
    } finally {
      setIsTranscribing(false)
    }
  }, [copy.failed, onTranscript, showToast])

  const liveRecognition = useLiveSpeechRecognition({
    onTranscript: (text) => onLiveTranscript?.(text),
  })
  const recorder = useAudioRecorder({
    onComplete: transcribe,
    onError: reportError,
    onStart: () => {
      onDictationStart?.()
      liveRecognition.start(locale)
    },
  })
  const busy = recorder.status !== 'idle' || isTranscribing

  const stopRecording = useCallback(() => {
    liveRecognition.stop()
    recorder.stop()
  }, [liveRecognition, recorder])

  const cancelRecording = useCallback(() => {
    liveRecognition.cancel()
    recorder.cancel()
    onDictationCancel?.()
  }, [liveRecognition, onDictationCancel, recorder])

  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])

  if (recorder.status === 'recording') {
    return (
      <div className="flex h-11 items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-1.5 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
        <span
          className="flex min-w-14 items-center gap-1.5 px-1 text-xs font-semibold"
          aria-label={`${copy.recording} ${recorder.elapsedSeconds} s`}
          aria-live="polite"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          {Math.floor(recorder.elapsedSeconds / 60)}:{String(recorder.elapsedSeconds % 60).padStart(2, '0')}
        </span>
        <button
          type="button"
          onClick={stopRecording}
          className="rounded-lg p-2 transition-colors hover:bg-red-100 dark:hover:bg-red-900/40"
          aria-label={copy.stop}
          title={copy.stop}
        >
          <Square size={15} fill="currentColor" />
        </button>
        <button
          type="button"
          onClick={cancelRecording}
          className="rounded-lg p-2 transition-colors hover:bg-red-100 dark:hover:bg-red-900/40"
          aria-label={copy.cancel}
          title={copy.cancel}
        >
          <X size={17} />
        </button>
      </div>
    )
  }

  const loading = recorder.status === 'requesting' || isTranscribing
  const label = isTranscribing ? copy.transcribing : recorder.status === 'requesting' ? copy.requesting : copy.start

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-11 shrink-0 rounded-xl p-0"
      disabled={disabled || loading}
      onClick={() => void recorder.start()}
      aria-label={label}
      title={label}
    >
      {loading ? <Loader2 size={17} className="animate-spin" /> : <Mic size={18} />}
    </Button>
  )
}
