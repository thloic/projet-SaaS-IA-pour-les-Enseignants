'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, ClipboardList, Circle, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/shared/ToastProvider'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import type { FollowUpPlanChatMessage } from '@/features/agent/types/conversation.types'
import type { FollowUpPlanItemStatus } from '@/features/agent/schemas/followUpPlanTrackingSchema'
import { updateFollowUpPlanItemStatusAction } from '@/features/agent/server/followUpPlanTracking.actions'

interface FollowUpPlanCardProps {
  planId: string
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
    status: 'Statut',
    aSuivre: 'À suivre',
    atteint: 'Atteint',
    nonAtteint: 'Non atteint',
    updateFailed: 'La mise à jour du statut a échoué.',
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
    status: 'Status',
    aSuivre: 'To follow',
    atteint: 'Achieved',
    nonAtteint: 'Not achieved',
    updateFailed: 'The status update failed.',
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
    status: 'Estado',
    aSuivre: 'Por seguir',
    atteint: 'Logrado',
    nonAtteint: 'No logrado',
    updateFailed: 'No se pudo actualizar el estado.',
  },
} as const

const STATUS_OPTIONS: Array<{ value: FollowUpPlanItemStatus; icon: typeof Circle }> = [
  { value: 'a_suivre', icon: Circle },
  { value: 'atteint', icon: CheckCircle2 },
  { value: 'non_atteint', icon: XCircle },
]

export default function FollowUpPlanCard({ planId, items }: FollowUpPlanCardProps) {
  const { locale } = useAppLocale()
  const { showToast } = useToast()
  const labels = LABELS[locale]
  const [statuses, setStatuses] = useState<Record<string, FollowUpPlanItemStatus>>(() =>
    Object.fromEntries(items.map((item) => [item.sourceId, 'a_suivre' as const]))
  )
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function statusLabel(status: FollowUpPlanItemStatus) {
    return status === 'atteint' ? labels.atteint : status === 'non_atteint' ? labels.nonAtteint : labels.aSuivre
  }

  function handleStatusChange(sourceId: string, status: FollowUpPlanItemStatus) {
    if (statuses[sourceId] === status || pendingSourceId) return
    const previous = statuses[sourceId]
    setStatuses((current) => ({ ...current, [sourceId]: status }))
    setPendingSourceId(sourceId)

    startTransition(async () => {
      const result = await updateFollowUpPlanItemStatusAction({ planId, sourceId, status })
      setPendingSourceId(null)
      if (result.error) {
        setStatuses((current) => ({ ...current, [sourceId]: previous }))
        showToast(labels.updateFailed, 'error')
      }
    })
  }

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
          <div key={item.sourceId} className="space-y-2 rounded-lg border border-input bg-background p-3 text-sm">
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

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-medium text-muted-foreground">{labels.status} :</span>
              {STATUS_OPTIONS.map(({ value, icon: Icon }) => {
                const selected = statuses[item.sourceId] === value
                return (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={selected ? 'default' : 'outline'}
                    disabled={pendingSourceId === item.sourceId}
                    onClick={() => handleStatusChange(item.sourceId, value)}
                  >
                    <Icon size={14} /> {statusLabel(value)}
                  </Button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
