'use client'

import { useCallback, useEffect, useState } from 'react'
import { Mail, HardDrive, Send } from 'lucide-react'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import type { AppLocale } from '@/features/i18n/locale'
import type { GoogleIntegrationFeature } from '../schemas/googleIntegrationSchema'

interface FeatureStatus {
  feature: GoogleIntegrationFeature
  connected: boolean
}

const FEATURES: GoogleIntegrationFeature[] = ['gmail_read', 'gmail', 'drive']

const LABELS: Record<AppLocale, {
  title: string
  intro: string
  connected: string
  notConnected: string
  connect: string
  disconnect: string
  loadError: string
  disconnectError: string
  features: Record<GoogleIntegrationFeature, { label: string; hint: string }>
}> = {
  fr: {
    title: 'Connexion Google',
    intro: 'L’agent demande l’accès une seule fois ici ou depuis la carte de l’agent. Vous pouvez tout déconnecter à tout moment.',
    connected: 'Connecté',
    notConnected: 'Non connecté',
    connect: 'Connecter',
    disconnect: 'Déconnecter Google',
    loadError: 'Impossible de vérifier la connexion Google pour le moment.',
    disconnectError: 'La déconnexion n’a pas pu être effectuée. Réessayez.',
    features: {
      gmail_read: { label: 'Gmail — recherche', hint: 'Chercher dans votre boîte mail (lecture seule).' },
      gmail: { label: 'Gmail — envoi', hint: 'Envoyer les courriels aux parents après votre relecture.' },
      drive: { label: 'Google Drive', hint: 'Accéder aux seuls fichiers que vous choisissez.' },
    },
  },
  en: {
    title: 'Google connection',
    intro: 'The agent asks for access once, here or from the agent card. You can disconnect everything at any time.',
    connected: 'Connected',
    notConnected: 'Not connected',
    connect: 'Connect',
    disconnect: 'Disconnect Google',
    loadError: 'Could not check the Google connection right now.',
    disconnectError: 'Disconnection failed. Please try again.',
    features: {
      gmail_read: { label: 'Gmail — search', hint: 'Search your mailbox (read only).' },
      gmail: { label: 'Gmail — sending', hint: 'Send parent emails after your review.' },
      drive: { label: 'Google Drive', hint: 'Access only the files you choose.' },
    },
  },
  es: {
    title: 'Conexión con Google',
    intro: 'El agente pide el acceso una sola vez, aquí o desde la tarjeta del agente. Puedes desconectar todo en cualquier momento.',
    connected: 'Conectado',
    notConnected: 'No conectado',
    connect: 'Conectar',
    disconnect: 'Desconectar Google',
    loadError: 'No se puede comprobar la conexión con Google en este momento.',
    disconnectError: 'No se pudo desconectar. Inténtalo de nuevo.',
    features: {
      gmail_read: { label: 'Gmail — búsqueda', hint: 'Buscar en tu correo (solo lectura).' },
      gmail: { label: 'Gmail — envío', hint: 'Enviar correos a las familias tras tu revisión.' },
      drive: { label: 'Google Drive', hint: 'Acceder solo a los archivos que elijas.' },
    },
  },
}

const FEATURE_ICON: Record<GoogleIntegrationFeature, typeof Mail> = {
  gmail_read: Mail,
  gmail: Send,
  drive: HardDrive,
}

async function fetchStatuses(): Promise<FeatureStatus[]> {
  return Promise.all(
    FEATURES.map(async (feature) => {
      const response = await fetch(`/api/integrations/google/status?feature=${feature}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('STATUS_HTTP_ERROR')
      const body = (await response.json()) as { connected: boolean }
      return { feature, connected: body.connected }
    })
  )
}

export default function GoogleConnectionsSection() {
  const { locale } = useAppLocale()
  const labels = LABELS[locale]
  const [statuses, setStatuses] = useState<FeatureStatus[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Rechargement explicite (après déconnexion) : l'état n'est mis à jour que
  // dans les callbacks asynchrones, jamais de façon synchrone dans un effet.
  const refresh = useCallback(() => {
    return fetchStatuses()
      .then((results) => {
        setStatuses(results)
        setError(null)
      })
      .catch((err: unknown) => {
        console.error('[settings:google] statut indisponible', err)
        setError(labels.loadError)
      })
  }, [labels.loadError])

  useEffect(() => {
    let active = true
    fetchStatuses()
      .then((results) => {
        if (!active) return
        setStatuses(results)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!active) return
        console.error('[settings:google] statut indisponible', err)
        setError(labels.loadError)
      })
    return () => {
      active = false
    }
  }, [labels.loadError])

  async function handleDisconnect() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/integrations/google', { method: 'DELETE' })
      if (!response.ok) throw new Error('DISCONNECT_HTTP_ERROR')
      await refresh()
    } catch (err) {
      console.error('[settings:google] déconnexion refusée', err)
      setError(labels.disconnectError)
    } finally {
      setBusy(false)
    }
  }

  const anyConnected = statuses?.some((status) => status.connected) ?? false

  return (
    <section className="space-y-4">
      <h2 className="font-bold text-sm uppercase tracking-wider text-[#534AB7]">{labels.title}</h2>
      <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">{labels.intro}</p>

      {statuses === null && !error ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : null}

      {statuses ? (
        <ul className="divide-y divide-border">
          {statuses.map(({ feature, connected }) => {
            const Icon = FEATURE_ICON[feature]
            const copy = labels.features[feature]
            return (
              <li key={feature} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Icon size={18} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{copy.label}</p>
                    <p className="text-xs text-muted-foreground">{copy.hint}</p>
                  </div>
                </div>
                {connected ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    {labels.connected}
                  </span>
                ) : (
                  <a
                    href={`/api/integrations/google/connect?feature=${feature}`}
                    className="inline-flex items-center rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted/60"
                  >
                    {labels.connect}
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}

      {anyConnected ? (
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={busy}
          className="inline-flex items-center rounded-lg border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50"
        >
          {labels.disconnect}
        </button>
      ) : null}

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </div>
    </section>
  )
}
