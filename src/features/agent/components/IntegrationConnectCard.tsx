'use client'

import { Mail } from 'lucide-react'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'

interface IntegrationConnectCardProps {
  message: string
  connectUrl: string
}

const LABELS = {
  fr: {
    connectGmail: 'Connecter Gmail',
    hint: 'Une fois connecté, votre demande reprendra automatiquement.',
  },
  en: {
    connectGmail: 'Connect Gmail',
    hint: 'Once connected, your request will resume automatically.',
  },
  es: {
    connectGmail: 'Conectar Gmail',
    hint: 'Una vez conectado, tu solicitud se reanudará automáticamente.',
  },
} as const

// Meme convention visuelle que la branche "pas connecte" de
// ParentEmailDraftCard.tsx. Fonctionne sans JS (lien <a> classique) ; la
// reprise automatique de la demande est geree par AgentChat.tsx apres le
// retour d'OAuth, pas par ce composant.
export default function IntegrationConnectCard({ message, connectUrl }: IntegrationConnectCardProps) {
  const { locale } = useAppLocale()
  const labels = LABELS[locale]

  return (
    <div className="w-full space-y-2 rounded-2xl border border-primary/20 bg-card p-4 text-foreground shadow-sm">
      <p className="text-sm text-muted-foreground">{message}</p>
      <a
        href={connectUrl}
        className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/60"
      >
        <Mail size={15} /> {labels.connectGmail}
      </a>
      <p className="text-xs text-muted-foreground">{labels.hint}</p>
    </div>
  )
}
