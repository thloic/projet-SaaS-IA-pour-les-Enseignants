import type { AppLocale } from '@/features/i18n/locale'

export const voiceInputTranslations = {
  fr: {
    start: 'Dicter un message',
    stop: 'Arrêter et transcrire',
    cancel: 'Annuler l’enregistrement',
    requesting: 'Autorisation du micro…',
    recording: 'Écoute en cours',
    transcribing: 'Transcription…',
    failed: 'La transcription audio a échoué. Vous pouvez réessayer ou écrire votre message.',
    unsupported: 'L’enregistrement audio n’est pas pris en charge par ce navigateur.',
  },
  en: {
    start: 'Dictate a message',
    stop: 'Stop and transcribe',
    cancel: 'Cancel recording',
    requesting: 'Requesting microphone…',
    recording: 'Listening',
    transcribing: 'Transcribing…',
    failed: 'Audio transcription failed. You can try again or type your message.',
    unsupported: 'Audio recording is not supported by this browser.',
  },
  es: {
    start: 'Dictar un mensaje',
    stop: 'Detener y transcribir',
    cancel: 'Cancelar la grabación',
    requesting: 'Solicitando acceso al micrófono…',
    recording: 'Escuchando',
    transcribing: 'Transcribiendo…',
    failed: 'La transcripción de audio falló. Puedes intentarlo de nuevo o escribir el mensaje.',
    unsupported: 'Este navegador no admite la grabación de audio.',
  },
} as const satisfies Record<AppLocale, object>
