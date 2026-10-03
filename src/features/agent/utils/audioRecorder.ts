import type { SupportedAudioMimeType } from '../schemas/audioTranscriptionSchema.ts'

const BROWSER_AUDIO_MIME_PREFERENCES = [
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/webm',
] as const

export function selectSupportedRecorderMimeType(
  isTypeSupported: (mimeType: string) => boolean
): string | undefined {
  return BROWSER_AUDIO_MIME_PREFERENCES.find(isTypeSupported)
}

export function getAudioFileExtension(mimeType: string): string {
  const normalized = mimeType.split(';', 1)[0]?.toLowerCase()
  if (normalized === 'audio/mp4') return 'm4a'
  if (normalized === 'audio/mpeg') return 'mp3'
  if (normalized === 'audio/wav') return 'wav'
  if (normalized === 'audio/ogg') return 'ogg'
  return 'webm'
}

export function toSupportedAudioMimeType(mimeType: string): SupportedAudioMimeType {
  const normalized = mimeType.split(';', 1)[0]?.toLowerCase()
  if (
    normalized === 'audio/mp4' ||
    normalized === 'audio/mpeg' ||
    normalized === 'audio/wav' ||
    normalized === 'audio/ogg'
  ) {
    return normalized
  }
  return 'audio/webm'
}

export function mergeTranscript(currentText: string, transcript: string): string {
  const current = currentText.trimEnd()
  const addition = transcript.trim()
  if (!current) return addition
  if (!addition) return currentText
  return `${current} ${addition}`
}

export function composeVoiceDraft(textBeforeDictation: string, liveTranscript: string): string {
  return mergeTranscript(textBeforeDictation, liveTranscript)
}
