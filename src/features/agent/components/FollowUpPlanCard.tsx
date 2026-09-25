'use client'

import { ClipboardList } from 'lucide-react'

import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import type { FollowUpPlanChatMessage } from '@/features/agent/types/conversation.types'

interface FollowUpPlanCardProps {
  items: FollowUpPlanChatMessage['items']
}

const LABELS = {
  fr: {
    title: 'Brouillon de plan de suivi',
    hint: 'À relire avant de le conserver — chaque élément s’appuie sur une donnée réelle du dossier.',
    source: 'D’après',
    constat: 'Constat',
    objectif: 'Objectif',
    indicateur: 'Indicateur',
    echeance: 'Révision',
    prochaineEtape: 'Prochaine étape',
  },
  en: {
    title: 'Follow-up plan draft',
    hint: 'Review before keeping it — each item is grounded in a real record.',
    source: 'Based on',
    constat: 'Observation',
    objectif: 'Objective',
    indicateur: 'Indicator',
    echeance: 'Review by',
    prochaineEtape: 'Next step',
  },
  es: {
    title: 'Borrador de plan de seguimiento',
    hint: 'Revísalo antes de conservarlo — cada elemento se basa en un dato real del expediente.',
    source: 'Según',
    constat: 'Constatación',
    objectif: 'Objetivo',
    indicateur: 'Indicador',
    echeance: 'Revisión',
    prochaineEtape: 'Próximo paso',
  },
} as const

export default function FollowUpPlanCard({ items }: FollowUpPlanCardProps) {
  const { locale } = useAppLocale()
  const labels = LABELS[locale]

  return (
    <div className="w-full space-y-4 rounded-2xl border border-primary/20 bg-card p-4 text-foreground shadow-sm">
      <div className="flex items-center gap-2">
        <ClipboardList size={16} className="text-primary" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{labels.title}</p>
          <p className="text-xs text-muted-foreground">{labels.hint}</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.sourceId} className="space-y-1.5 rounded-lg border border-input bg-background p-3 text-sm">
            <p className="text-xs text-muted-foreground">
              {labels.source} : {item.source}
            </p>
            <p>
              <span className="font-medium">{labels.constat} : </span>
              {item.constat}
            </p>
            <p>
              <span className="font-medium">{labels.objectif} : </span>
              {item.objectif}
            </p>
            <p>
              <span className="font-medium">{labels.indicateur} : </span>
              {item.indicateur}
            </p>
            <p>
              <span className="font-medium">{labels.echeance} : </span>
              {item.echeance}
            </p>
            <p>
              <span className="font-medium">{labels.prochaineEtape} : </span>
              {item.prochaineEtape}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
