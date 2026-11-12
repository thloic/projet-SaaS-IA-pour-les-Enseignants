'use client'

import { useState } from 'react'
import { Check, ExternalLink, Loader2, X } from 'lucide-react'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import type { AppLocale } from '@/features/i18n/locale'
import type { DriveChangeProposalChatMessage } from '@/features/agent/types/conversation.types'

// Carte « Confirmer / Annuler » d'une modification Drive proposée par l'agent.
// Rien n'est écrit tant que l'enseignant ne clique pas sur Confirmer ; l'écriture
// passe par POST /api/agent/drive/apply, qui revalide la modification.
type Props = Pick<DriveChangeProposalChatMessage, 'message' | 'change' | 'targetName' | 'webViewLink'>

type CardState =
  | { phase: 'idle' }
  | { phase: 'applying' }
  | { phase: 'done'; webViewLink: string | null }
  | { phase: 'cancelled' }
  | { phase: 'error'; reason: string }

const LABELS: Record<AppLocale, {
  update: string
  create: string
  confirm: string
  cancel: string
  applying: string
  done: string
  cancelled: string
  open: string
  errors: Record<string, string>
  generic: string
}> = {
  fr: {
    update: 'Modifier le document',
    create: 'Créer un document',
    confirm: 'Confirmer',
    cancel: 'Annuler',
    applying: 'Enregistrement…',
    done: 'Modification appliquée dans Google Drive.',
    cancelled: 'Modification annulée. Rien n’a été modifié.',
    open: 'Ouvrir dans Drive',
    errors: {
      DRIVE_NOT_CONNECTED: 'Google Drive n’est pas connecté. Reconnectez-le dans les réglages.',
      DRIVE_SCOPE_MISSING: 'Accès Drive incomplet. Reconnectez Google Drive dans les réglages.',
      FILE_NOT_FOUND: 'Ce fichier n’existe plus dans votre Drive.',
      CHANGE_UNSUPPORTED: 'Ce fichier ne peut pas être modifié : seul un Google Doc peut l’être.',
    },
    generic: 'La modification n’a pas pu être appliquée. Rien n’a été modifié.',
  },
  en: {
    update: 'Edit document',
    create: 'Create document',
    confirm: 'Confirm',
    cancel: 'Cancel',
    applying: 'Saving…',
    done: 'Change applied in Google Drive.',
    cancelled: 'Change cancelled. Nothing was modified.',
    open: 'Open in Drive',
    errors: {
      DRIVE_NOT_CONNECTED: 'Google Drive is not connected. Reconnect it in Settings.',
      DRIVE_SCOPE_MISSING: 'Drive access is incomplete. Reconnect Google Drive in Settings.',
      FILE_NOT_FOUND: 'This file no longer exists in your Drive.',
      CHANGE_UNSUPPORTED: 'This file cannot be edited: only a Google Doc can be.',
    },
    generic: 'The change could not be applied. Nothing was modified.',
  },
  es: {
    update: 'Modificar el documento',
    create: 'Crear un documento',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    applying: 'Guardando…',
    done: 'Modificación aplicada en Google Drive.',
    cancelled: 'Modificación cancelada. No se ha modificado nada.',
    open: 'Abrir en Drive',
    errors: {
      DRIVE_NOT_CONNECTED: 'Google Drive no está conectado. Vuelve a conectarlo en los ajustes.',
      DRIVE_SCOPE_MISSING: 'El acceso a Drive está incompleto. Vuelve a conectar Google Drive en los ajustes.',
      FILE_NOT_FOUND: 'Este archivo ya no existe en tu Drive.',
      CHANGE_UNSUPPORTED: 'Este archivo no se puede modificar: solo se puede modificar un Google Doc.',
    },
    generic: 'No se pudo aplicar la modificación. No se ha modificado nada.',
  },
}

export default function DriveChangeCard({ message, change, targetName }: Props) {
  const { locale } = useAppLocale()
  const labels = LABELS[locale]
  const [state, setState] = useState<CardState>({ phase: 'idle' })

  async function handleConfirm() {
    setState({ phase: 'applying' })
    try {
      const response = await fetch('/api/agent/drive/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setState({ phase: 'error', reason: labels.errors[body.error ?? ''] ?? labels.generic })
        return
      }
      const body = (await response.json()) as { webViewLink: string | null }
      setState({ phase: 'done', webViewLink: body.webViewLink })
    } catch (err) {
      console.error('[agent:drive-change-card] envoi impossible', err)
      setState({ phase: 'error', reason: labels.generic })
    }
  }

  const decided = state.phase === 'done' || state.phase === 'cancelled'

  return (
    <div className="w-full space-y-3 rounded-2xl border border-primary/20 bg-card p-4 text-foreground shadow-sm">
      <p className="text-sm text-muted-foreground">{message}</p>

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {change.type === 'update_doc' ? labels.update : labels.create}
        </p>
        <p className="text-sm font-medium">{targetName}</p>
      </div>

      {/* Texte COMPLET : ce que l'enseignant valide est exactement ce qui sera écrit. */}
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 font-sans text-sm leading-relaxed">
        {change.text}
      </pre>

      {state.phase === 'done' ? (
        <div className="space-y-2">
          <p role="status" className="text-sm text-emerald-700">{labels.done}</p>
          {state.webViewLink ? (
            <a href={state.webViewLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium underline">
              <ExternalLink size={14} /> {labels.open}
            </a>
          ) : null}
        </div>
      ) : null}

      {state.phase === 'cancelled' ? <p className="text-sm text-muted-foreground">{labels.cancelled}</p> : null}
      {state.phase === 'error' ? <p role="alert" className="text-sm text-destructive">{state.reason}</p> : null}

      {!decided ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={state.phase === 'applying'}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {state.phase === 'applying' ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {state.phase === 'applying' ? labels.applying : labels.confirm}
          </button>
          <button
            type="button"
            onClick={() => setState({ phase: 'cancelled' })}
            disabled={state.phase === 'applying'}
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/60 disabled:opacity-50"
          >
            <X size={15} /> {labels.cancel}
          </button>
        </div>
      ) : null}
    </div>
  )
}
