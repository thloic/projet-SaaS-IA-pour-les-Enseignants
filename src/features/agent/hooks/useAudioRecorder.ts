'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_AUDIO_DURATION_MS } from '@/features/agent/schemas/audioTranscriptionSchema'
import { selectSupportedRecorderMimeType } from '@/features/agent/utils/audioRecorder'

type RecorderStatus = 'idle' | 'requesting' | 'recording'

interface RecordedAudio {
  blob: Blob
  durationMs: number
}

interface UseAudioRecorderOptions {
  onComplete: (recording: RecordedAudio) => void | Promise<void>
  onError: (error: Error) => void
  onStart?: () => void
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

export function useAudioRecorder({ onComplete, onError, onStart }: UseAudioRecorderOptions) {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const cancelledRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanupTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    timeoutRef.current = null
    intervalRef.current = null
  }, [])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder?.state === 'recording') recorder.stop()
  }, [])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    stop()
  }, [stop])

  const start = useCallback(async () => {
    if (status !== 'idle') return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onError(new Error('AUDIO_RECORDING_UNSUPPORTED'))
      return
    }

    setStatus('requesting')
    cancelledRef.current = false
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const preferredMimeType = selectSupportedRecorderMimeType((mimeType) =>
        MediaRecorder.isTypeSupported(mimeType)
      )
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => onError(new Error('AUDIO_RECORDING_FAILED'))
      recorder.onstop = () => {
        cleanupTimers()
        const durationMs = Math.min(Date.now() - startedAtRef.current, MAX_AUDIO_DURATION_MS)
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || preferredMimeType || 'audio/webm',
        })
        stopTracks(streamRef.current)
        streamRef.current = null
        recorderRef.current = null
        chunksRef.current = []
        setStatus('idle')
        setElapsedSeconds(0)

        if (!cancelledRef.current && blob.size > 0) {
          void Promise.resolve(onComplete({ blob, durationMs })).catch((error: unknown) => {
            onError(error instanceof Error ? error : new Error('AUDIO_TRANSCRIPTION_FAILED'))
          })
        }
      }

      startedAtRef.current = Date.now()
      recorder.start(250)
      setStatus('recording')
      setElapsedSeconds(0)
      onStart?.()
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(Math.min(90, Math.floor((Date.now() - startedAtRef.current) / 1000)))
      }, 1_000)
      timeoutRef.current = setTimeout(stop, MAX_AUDIO_DURATION_MS)
    } catch (error) {
      stopTracks(streamRef.current)
      streamRef.current = null
      recorderRef.current = null
      setStatus('idle')
      onError(error instanceof Error ? error : new Error('MICROPHONE_PERMISSION_DENIED'))
    }
  }, [cleanupTimers, onComplete, onError, onStart, status, stop])

  useEffect(() => () => {
    cancelledRef.current = true
    cleanupTimers()
    const recorder = recorderRef.current
    if (recorder?.state === 'recording') recorder.stop()
    stopTracks(streamRef.current)
  }, [cleanupTimers])

  return { status, elapsedSeconds, start, stop, cancel }
}
