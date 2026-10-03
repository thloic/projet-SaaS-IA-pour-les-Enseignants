'use client'

import { useEffect, useState } from 'react'
import { Copy, Languages, Loader2, Mail, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/shared/ToastProvider'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import type { ParentEmailRegister } from '@/features/agent/schemas/parentEmailSchema'
import { translateParentEmailDraftAction } from '@/features/agent/server/parentEmailTranslation.actions'
import { sendParentEmailAction } from '@/features/agent/server/parentEmailSend.actions'

interface ParentEmailDraftCardProps {
  draftId: string
  register: ParentEmailRegister
  initialSubject: string
  initialBody: string
  familyLanguage: string
  suggestedRecipientEmail?: string
}

const LABELS = {
  fr: {
    title: 'Courriel aux parents',
    hint: 'Brouillon enregistré dans votre historique — relisez et ajustez avant de l’envoyer vous-même.',
    subject: 'Sujet',
    body: 'Message',
    copy: 'Copier le message',
    copied: 'Message copié.',
    register: {
      comportement: 'Comportement',
      echec: 'Difficulté académique',
      plagiat: 'Plagiat',
      autre: 'Autre',
    },
    translateLanguageLabel: 'Langue cible',
    translate: 'Traduire',
    translating: 'Traduction…',
    translationTitle: (language: string) => `Traduction (${language})`,
    translationHint: 'À relire également avant d’envoyer — jamais envoyée automatiquement.',
    translationCopy: 'Copier la traduction',
    translationCopied: 'Traduction copiée.',
    authRequired: 'Vous devez être connecté pour traduire ce message.',
    quotaExceeded: 'Vous avez atteint votre limite de générations ce mois-ci.',
    translationFailed: 'La traduction a échoué, réessayez dans un instant.',
    invalidInput: 'Complétez la langue cible avant de traduire.',
    sendTo: 'Adresse du parent',
    sendVersionOriginal: 'Version originale',
    sendVersionTranslated: (language: string) => `Version traduite (${language})`,
    send: 'Envoyer',
    sending: 'Envoi…',
    sendConfirmHint: 'L’envoi part directement de votre propre boîte Gmail connectée.',
    sent: (to: string) => `Envoyé à ${to}.`,
    connectGmail: 'Connecter Gmail pour envoyer',
    connectGmailHint: 'Connectez votre Gmail une seule fois pour pouvoir envoyer vos courriels directement depuis l’agent.',
    sendAuthRequired: 'Vous devez être connecté pour envoyer ce courriel.',
    sendQuotaExceeded: 'Vous avez atteint votre limite d’envois ce mois-ci.',
    sendFailed: 'L’envoi a échoué, réessayez dans un instant.',
    sendInvalidEmail: 'Entrez une adresse courriel valide pour le parent.',
    sendGoogleNotConnected: 'Connectez votre Gmail avant d’envoyer.',
  },
  en: {
    title: 'Parent email',
    hint: 'Draft saved to your history — review and adjust before sending it yourself.',
    subject: 'Subject',
    body: 'Message',
    copy: 'Copy message',
    copied: 'Message copied.',
    register: {
      comportement: 'Behavior',
      echec: 'Academic difficulty',
      plagiat: 'Plagiarism',
      autre: 'Other',
    },
    translateLanguageLabel: 'Target language',
    translate: 'Translate',
    translating: 'Translating…',
    translationTitle: (language: string) => `Translation (${language})`,
    translationHint: 'Also review before sending — never sent automatically.',
    translationCopy: 'Copy translation',
    translationCopied: 'Translation copied.',
    authRequired: 'You must be signed in to translate this message.',
    quotaExceeded: 'You have reached your generation limit this month.',
    translationFailed: 'The translation failed, try again shortly.',
    invalidInput: 'Fill in the target language before translating.',
    sendTo: 'Parent’s email address',
    sendVersionOriginal: 'Original version',
    sendVersionTranslated: (language: string) => `Translated version (${language})`,
    send: 'Send',
    sending: 'Sending…',
    sendConfirmHint: 'This sends directly from your own connected Gmail account.',
    sent: (to: string) => `Sent to ${to}.`,
    connectGmail: 'Connect Gmail to send',
    connectGmailHint: 'Connect your Gmail once to send your emails directly from the agent.',
    sendAuthRequired: 'You must be signed in to send this email.',
    sendQuotaExceeded: 'You have reached your sending limit this month.',
    sendFailed: 'Sending failed, try again shortly.',
    sendInvalidEmail: 'Enter a valid email address for the parent.',
    sendGoogleNotConnected: 'Connect your Gmail before sending.',
  },
  es: {
    title: 'Correo a los padres',
    hint: 'Borrador guardado en tu historial — revísalo y ajústalo antes de enviarlo tú mismo.',
    subject: 'Asunto',
    body: 'Mensaje',
    copy: 'Copiar mensaje',
    copied: 'Mensaje copiado.',
    register: {
      comportement: 'Comportamiento',
      echec: 'Dificultad académica',
      plagiat: 'Plagio',
      autre: 'Otro',
    },
    translateLanguageLabel: 'Idioma de destino',
    translate: 'Traducir',
    translating: 'Traduciendo…',
    translationTitle: (language: string) => `Traducción (${language})`,
    translationHint: 'Revísala también antes de enviarla — nunca se envía automáticamente.',
    translationCopy: 'Copiar traducción',
    translationCopied: 'Traducción copiada.',
    authRequired: 'Debes iniciar sesión para traducir este mensaje.',
    quotaExceeded: 'Has alcanzado tu límite de generaciones este mes.',
    translationFailed: 'La traducción ha fallado, inténtalo de nuevo en un momento.',
    invalidInput: 'Completa el idioma de destino antes de traducir.',
    sendTo: 'Correo del padre/madre',
    sendVersionOriginal: 'Versión original',
    sendVersionTranslated: (language: string) => `Versión traducida (${language})`,
    send: 'Enviar',
    sending: 'Enviando…',
    sendConfirmHint: 'Se envía directamente desde tu propia cuenta de Gmail conectada.',
    sent: (to: string) => `Enviado a ${to}.`,
    connectGmail: 'Conectar Gmail para enviar',
    connectGmailHint: 'Conecta tu Gmail una sola vez para enviar tus correos directamente desde el agente.',
    sendAuthRequired: 'Debes iniciar sesión para enviar este correo.',
    sendQuotaExceeded: 'Has alcanzado tu límite de envíos este mes.',
    sendFailed: 'El envío ha fallado, inténtalo de nuevo en un momento.',
    sendInvalidEmail: 'Introduce un correo válido para el padre/madre.',
    sendGoogleNotConnected: 'Conecta tu Gmail antes de enviar.',
  },
} as const

export default function ParentEmailDraftCard({
  draftId,
  register,
  initialSubject,
  initialBody,
  familyLanguage,
  suggestedRecipientEmail,
}: ParentEmailDraftCardProps) {
  const { showToast } = useToast()
  const { locale } = useAppLocale()
  const labels = LABELS[locale]
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [targetLanguage, setTargetLanguage] = useState(familyLanguage)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translation, setTranslation] = useState<{ subject: string; body: string; language: string } | null>(null)
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null)
  const [connectUrl, setConnectUrl] = useState('/api/integrations/google/connect?feature=gmail')
  // Prerempli si l'enseignant a deja donne l'adresse dans son message — il
  // garde la main pour la corriger avant de confirmer l'envoi.
  const [recipient, setRecipient] = useState(suggestedRecipientEmail ?? '')
  const [sendVersion, setSendVersion] = useState<'original' | 'translated'>('original')
  const [isSending, setIsSending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    console.log('[parent-email-card] vérification du statut Gmail pour draftId', draftId)
    fetch('/api/integrations/google/status')
      .then((response) => {
        console.log('[parent-email-card] réponse statut Gmail', response.status)
        return response.ok ? response.json() : null
      })
      .then((data) => {
        console.log('[parent-email-card] données statut Gmail', data)
        if (cancelled || !data) return
        setGmailConnected(Boolean(data.gmailConnected))
        if (typeof data.connectUrl === 'string') setConnectUrl(data.connectUrl)
      })
      .catch((error) => {
        console.error('[parent-email-card] échec de la vérification du statut Gmail', error)
        if (!cancelled) setGmailConnected(false)
      })
    return () => {
      cancelled = true
    }
  }, [draftId])

  async function handleCopy() {
    await navigator.clipboard.writeText(`${subject}\n\n${body}`)
    showToast(labels.copied, 'success')
  }

  async function handleCopyTranslation() {
    if (!translation) return
    await navigator.clipboard.writeText(`${translation.subject}\n\n${translation.body}`)
    showToast(labels.translationCopied, 'success')
  }

  async function handleTranslate() {
    const trimmedLanguage = targetLanguage.trim()
    if (!trimmedLanguage || isTranslating) {
      if (!trimmedLanguage) showToast(labels.invalidInput, 'error')
      return
    }

    setIsTranslating(true)
    try {
      const result = await translateParentEmailDraftAction({
        subject,
        body,
        targetLanguage: trimmedLanguage,
      })
      if (result.error === 'AUTH_REQUIRED') {
        showToast(labels.authRequired, 'error')
      } else if (result.error === 'QUOTA_EXCEEDED') {
        showToast(labels.quotaExceeded, 'error')
      } else if (result.error || !result.data) {
        showToast(labels.translationFailed, 'error')
      } else {
        setTranslation({ subject: result.data.subject, body: result.data.body, language: trimmedLanguage })
      }
    } catch (error) {
      console.error('[agent] échec de la traduction du courriel aux parents', error)
      showToast(labels.translationFailed, 'error')
    } finally {
      setIsTranslating(false)
    }
  }

  async function handleSend() {
    const trimmedRecipient = recipient.trim()
    if (!trimmedRecipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedRecipient)) {
      showToast(labels.sendInvalidEmail, 'error')
      return
    }
    if (isSending) return

    const versionToSend =
      sendVersion === 'translated' && translation
        ? { subject: translation.subject, body: translation.body }
        : { subject, body }

    setIsSending(true)
    console.log('[parent-email-card] envoi en cours', { draftId, to: trimmedRecipient, version: sendVersion })
    try {
      const result = await sendParentEmailAction({
        draftId,
        to: trimmedRecipient,
        subject: versionToSend.subject,
        body: versionToSend.body,
      })
      console.log('[parent-email-card] résultat de l’envoi', result)
      if (result.error === 'AUTH_REQUIRED') {
        showToast(labels.sendAuthRequired, 'error')
      } else if (result.error === 'GOOGLE_NOT_CONNECTED' || result.error === 'GOOGLE_SCOPE_MISSING') {
        setGmailConnected(false)
        showToast(labels.sendGoogleNotConnected, 'error')
      } else if (result.error === 'QUOTA_EXCEEDED') {
        showToast(labels.sendQuotaExceeded, 'error')
      } else if (result.error || !result.data) {
        showToast(labels.sendFailed, 'error')
      } else {
        setSentTo(trimmedRecipient)
        showToast(labels.sent(trimmedRecipient), 'success')
      }
    } catch (error) {
      console.error('[agent] échec de l’envoi du courriel aux parents', error)
      showToast(labels.sendFailed, 'error')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="w-full space-y-4 rounded-2xl border border-primary/20 bg-card p-4 text-foreground shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-primary" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {labels.title} — {labels.register[register]}
            </p>
            <p className="text-xs text-muted-foreground">{labels.hint}</p>
          </div>
        </div>
        <Button type="button" size="sm" onClick={() => void handleCopy()}>
          <Copy size={15} /> {labels.copy}
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="parent-email-subject">{labels.subject}</Label>
        <input
          id="parent-email-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="parent-email-body">{labels.body}</Label>
        <textarea
          id="parent-email-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="min-h-40 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <div className="min-w-40 flex-1 space-y-1.5">
          <Label htmlFor="parent-email-target-language">{labels.translateLanguageLabel}</Label>
          <input
            id="parent-email-target-language"
            value={targetLanguage}
            onChange={(event) => setTargetLanguage(event.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <Button type="button" variant="outline" size="sm" disabled={isTranslating} onClick={() => void handleTranslate()}>
          {isTranslating ? <Loader2 size={15} className="animate-spin" /> : <Languages size={15} />}
          {isTranslating ? labels.translating : labels.translate}
        </Button>
      </div>

      {translation && (
        <div className="space-y-3 rounded-xl border border-dashed border-primary/30 bg-background/60 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {labels.translationTitle(translation.language)}
              </p>
              <p className="text-xs text-muted-foreground">{labels.translationHint}</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => void handleCopyTranslation()}>
              <Copy size={15} /> {labels.translationCopy}
            </Button>
          </div>
          <p className="text-sm font-medium">{translation.subject}</p>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{translation.body}</p>
        </div>
      )}

      <div className="space-y-3 border-t border-border pt-3">
        {sentTo ? (
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Send size={15} /> {labels.sent(sentTo)}
          </p>
        ) : gmailConnected === false ? (
          <div className="space-y-1.5">
            <a
              href={connectUrl}
              className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/60"
            >
              <Mail size={15} /> {labels.connectGmail}
            </a>
            <p className="text-xs text-muted-foreground">{labels.connectGmailHint}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-48 flex-1 space-y-1.5">
                <Label htmlFor="parent-email-recipient">{labels.sendTo}</Label>
                <input
                  id="parent-email-recipient"
                  type="email"
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              {translation && (
                <div className="min-w-40 space-y-1.5">
                  <Label htmlFor="parent-email-send-version">{labels.sendVersionOriginal}</Label>
                  <select
                    id="parent-email-send-version"
                    value={sendVersion}
                    onChange={(event) => setSendVersion(event.target.value as 'original' | 'translated')}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="original">{labels.sendVersionOriginal}</option>
                    <option value="translated">{labels.sendVersionTranslated(translation.language)}</option>
                  </select>
                </div>
              )}
              <Button type="button" disabled={isSending || gmailConnected === null} onClick={() => void handleSend()}>
                {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {isSending ? labels.sending : labels.send}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{labels.sendConfirmHint}</p>
          </>
        )}
      </div>
    </div>
  )
}
