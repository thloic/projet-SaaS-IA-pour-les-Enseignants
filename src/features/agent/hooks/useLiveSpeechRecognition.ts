'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { AppLocale } from '@/features/i18n/locale'

interface SpeechRecognitionResultLike {
  readonly length: number
  readonly 0: { readonly transcript: string }
}

interface SpeechRecognitionEventLike extends Event {
  readonly results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike
}

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

const RECOGNITION_LOCALES: Record<AppLocale, string> = {
  fr: 'fr-CA',
  en: 'en-CA',
  es: 'es-MX',
}

function getRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const speechWindow = window as SpeechRecognitionWindow
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

interface UseLiveSpeechRecognitionOptions {
  onTranscript: (transcript: string) => void
}

/**
 * Provides best-effort interim text while MediaRecorder captures the authoritative audio.
 * Browser recognition is deliberately never treated as the final transcript.
 */
export function useLiveSpeechRecognition({ onTranscript }: UseLiveSpeechRecognitionOptions) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  const cancel = useCallback(() => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    try {
      recognition?.abort()
    } catch {
      // Some browsers throw when recognition has already ended.
    }
  }, [])

  const stop = useCallback(() => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    try {
      recognition?.stop()
    } catch {
      // The recorded audio will still be transcribed by the server.
    }
  }, [])

  const start = useCallback((locale: AppLocale) => {
    cancel()
    const Recognition = getRecognitionConstructor()
    if (!Recognition) return false

    try {
      const recognition = new Recognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = RECOGNITION_LOCALES[locale]
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        if (transcript) onTranscriptRef.current(transcript)
      }
      recognition.onerror = () => {
        recognitionRef.current = null
      }
      recognitionRef.current = recognition
      recognition.start()
      return true
    } catch {
      recognitionRef.current = null
      return false
    }
  }, [cancel])

  useEffect(() => cancel, [cancel])

  return { start, stop, cancel }
}
