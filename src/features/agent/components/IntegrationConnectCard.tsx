'use client'

import { HardDrive, Mail } from 'lucide-react'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import type { GoogleIntegrationFeature } from '@/features/integrations/google/schemas/googleIntegrationSchema'

interface IntegrationConnectCardProps {
  feature: GoogleIntegrationFeature
  message: string
  connectUrl: string
}

const CONNECT_LABELS: Record<GoogleIntegrationFeature, Record<'fr' | 'en' | 'es', string>> = {
  gmail: { fr: 'Connecter Gmail', en: 'Connect Gmail', es: 'Conectar Gmail' },
  drive: { fr: 'Connecter Google Drive', en: 'Connect Google Drive', es: 'Conectar Google Drive' },
}

const ICONS: Record<GoogleIntegrationFeature, typeof Mail> = {
  gmail: Mail,
  drive: HardDrive,
}

const HINT = {
  fr: 'Une fois connecté, votre demande reprendra automatiquement.',
  en: 'Once connected, your request will resume automatically.',
  es: 'Una vez conectado, tu solicitud se reanudará automáticamente.',
} as const

// Meme convention visuelle que la branche "pas connecte" de
// ParentEmailDraftCard.tsx. Fonctionne sans JS (lien <a> classique) ; la
// reprise automatique de la demande est geree par AgentChat.tsx apres le
// retour d'OAuth, pas par ce composant.
export default function IntegrationConnectCard({ feature, message, connectUrl }: IntegrationConnectCardProps) {
  const { locale } = useAppLocale()
  const Icon = ICONS[feature]

  return (
    <div className="w-full space-y-2 rounded-2xl border border-primary/20 bg-card p-4 text-foreground shadow-sm">
      <p className="text-sm text-muted-foreground">{message}</p>
      <a
        href={connectUrl}
        className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/60"
      >
        <Icon size={15} /> {CONNECT_LABELS[feature][locale]}
      </a>
      <p className="text-xs text-muted-foreground">{HINT[locale]}</p>
    </div>
  )
}
