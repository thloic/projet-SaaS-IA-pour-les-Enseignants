'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check, CheckCheck, FileCheck2, Loader2, Pencil, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/shared/ToastProvider'
import {
  retryCorrectionCopyAction,
  validateAllCompleteCorrectionCopiesAction,
  validateCorrectionCopyAction,
} from '@/features/correction/server/correction.actions'
import { buildCorrectionBatchRecap } from '@/features/correction/utils/correctionRecap'
import type { CorrectionFindingCategory, CorrectionTone } from '@/features/correction/schemas/correctionSchema'
import type { CorrectionBatchDetail as CorrectionBatchDetailData } from '@/features/correction/server/correction.actions'
import type { CorrectionCopyStatus } from '@/features/correction/types/correction.types'

const BRAND = '#534AB7'

const TONES: { value: CorrectionTone; label: string; desc: string }[] = [
  { value: 'encourageant', label: 'Encourageant', desc: 'Motive, met en avant les progrès' },
  { value: 'factuel', label: 'Factuel', desc: 'Sobre, centré sur les observations' },
  { value: 'direct', label: 'Direct', desc: 'Clair et concis' },
]

const FINDING_LABELS: Record<CorrectionFindingCategory, string> = {
  syntaxe: 'Syntaxe',
  comprehension: 'Compréhension',
  methode: 'Méthode',
}

const STATUS_META: Record<CorrectionCopyStatus, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-muted text-muted-foreground border-border' },
  generating: {
    label: 'En cours',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-300',
  },
  complete: {
    label: 'Corrigée',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-300',
  },
  failed: {
    label: 'Échec',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
  validated: {
    label: 'Validée',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-300',
  },
}

interface CorrectionBatchDetailProps {
  detail: CorrectionBatchDetailData
}

interface StreamEvent {
  type: 'ready' | 'copy_started' | 'copy_complete' | 'copy_failed' | 'complete'
  copyId?: string
  total?: number
}

export default function CorrectionBatchDetail({ detail }: CorrectionBatchDetailProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [tone, setTone] = useState<CorrectionTone>('encourageant')
  const [isLaunching, setIsLaunching] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, CorrectionCopyStatus>>(() =>
    Object.fromEntries(detail.copies.map((copy) => [copy.id, copy.status]))
  )
  const [comments, setComments] = useState<Record<string, string>>(() =>
    Object.fromEntries(detail.copies.map((copy) => [copy.id, copy.comment ?? '']))
  )
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [isValidatingAll, setIsValidatingAll] = useState(false)

  const total = detail.copies.length
  const doneCount = useMemo(
    () => Object.values(statuses).filter((status) => status === 'complete' || status === 'validated').length,
    [statuses]
  )
  const pendingValidationCount = useMemo(
    () => Object.values(statuses).filter((status) => status === 'complete').length,
    [statuses]
  )
  const recap = useMemo(
    () =>
      buildCorrectionBatchRecap(
        detail.copies.map((copy) => ({
          status: statuses[copy.id] ?? copy.status,
          findings: copy.findings,
        }))
      ),
    [detail.copies, statuses]
  )

  async function handleLaunch() {
    setIsLaunching(true)
    try {
      const response = await fetch('/api/correction/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: detail.batch.id, tone }),
      })

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null)
        showToast(body?.error ?? 'Le lancement de la correction a échoué.', 'error')
        setIsLaunching(false)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line) as StreamEvent
          if (event.type === 'copy_started' && event.copyId) {
            setStatuses((current) => ({ ...current, [event.copyId as string]: 'generating' }))
          } else if (event.type === 'copy_complete' && event.copyId) {
            setStatuses((current) => ({ ...current, [event.copyId as string]: 'complete' }))
          } else if (event.type === 'copy_failed' && event.copyId) {
            setStatuses((current) => ({ ...current, [event.copyId as string]: 'failed' }))
          }
        }
      }

      showToast('Correction terminée.', 'success')
      router.refresh()
    } catch (error) {
      console.error('[correction] flux de génération interrompu', error)
      showToast('La correction a été interrompue.', 'error')
    } finally {
      setIsLaunching(false)
    }
  }

  async function handleRetry(copyId: string) {
    setRetryingId(copyId)
    setStatuses((current) => ({ ...current, [copyId]: 'generating' }))
    const result = await retryCorrectionCopyAction(copyId)
    setRetryingId(null)
    if (result.error) {
      showToast(result.error, 'error')
      setStatuses((current) => ({ ...current, [copyId]: 'failed' }))
      return
    }
    showToast('Copie relancée avec succès.', 'success')
    router.refresh()
  }

  async function handleValidate(copyId: string, edited: boolean) {
    setValidatingId(copyId)
    const result = await validateCorrectionCopyAction(copyId, detail.batch.id, edited ? comments[copyId] : undefined)
    setValidatingId(null)
    if (result.error) {
      showToast(result.error, 'error')
      return
    }
    setStatuses((current) => ({ ...current, [copyId]: 'validated' }))
    setEditingId(null)
    showToast('Copie validée.', 'success')
    router.refresh()
  }

  async function handleValidateAll() {
    setIsValidatingAll(true)
    const result = await validateAllCompleteCorrectionCopiesAction(detail.batch.id)
    setIsValidatingAll(false)
    if (result.error) {
      showToast(result.error, 'error')
      return
    }
    setStatuses((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, status]) => [id, status === 'complete' ? 'validated' : status])
      )
    )
    showToast('Toutes les copies corrigées ont été validées.', 'success')
    router.refresh()
  }

  const canLaunch = detail.batch.status === 'draft' && !isLaunching

  return (
    <div className="space-y-6">
      {canLaunch && (
        <div className="space-y-3 rounded-2xl border border-border bg-card/40 p-4">
          <p className="text-sm font-medium">Ton du commentaire pour tout le lot</p>
          <div className="grid grid-cols-3 gap-2">
            {TONES.map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTone(value)}
                className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                  tone === value ? 'border-primary/60 bg-primary/10' : 'border-border bg-muted/20 hover:bg-muted/40'
                }`}
              >
                <p className="text-xs font-bold" style={tone === value ? { color: BRAND } : {}}>{label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
          <Button
            className="w-full gap-2 text-white"
            style={{ backgroundColor: BRAND }}
            onClick={() => void handleLaunch()}
            disabled={isLaunching}
          >
            {isLaunching ? <Loader2 size={16} className="animate-spin" /> : <FileCheck2 size={16} />}
            Lancer la correction ({total})
          </Button>
        </div>
      )}

      {(isLaunching || detail.batch.status !== 'draft') && (
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${total > 0 ? (doneCount / total) * 100 : 0}%`, backgroundColor: BRAND }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{doneCount} sur {total} copie(s) traitée(s)</p>
            {pendingValidationCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isValidatingAll}
                onClick={() => void handleValidateAll()}
              >
                {isValidatingAll ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                Tout valider ({pendingValidationCount})
              </Button>
            )}
          </div>
        </div>
      )}

      {recap.status === 'available' && (
        <div className="space-y-2 rounded-2xl border border-border bg-card/40 p-4">
          <p className="text-sm font-medium">Tableau récapitulatif de classe</p>
          <p className="text-xs text-muted-foreground">
            Sur {recap.validatedCount} copie{recap.validatedCount > 1 ? 's' : ''} validée
            {recap.validatedCount > 1 ? 's' : ''}, catégories d&apos;erreurs les plus fréquentes :
          </p>
          {recap.categories.length > 0 ? (
            <ul className="space-y-1.5">
              {recap.categories.map((item) => (
                <li
                  key={item.category}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm"
                >
                  <span>{FINDING_LABELS[item.category]}</span>
                  <Badge variant="outline">
                    {item.count} élève{item.count > 1 ? 's' : ''} concerné{item.count > 1 ? 's' : ''}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Aucune erreur détectée sur les copies validées.</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {detail.copies.map((copy) => {
          const status = statuses[copy.id] ?? copy.status
          const meta = STATUS_META[status]
          return (
            <article key={copy.id} className="rounded-2xl border border-border bg-card/40 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-sm">{copy.studentName}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={meta.className}>
                    {status === 'generating' && <Loader2 size={11} className="mr-1 animate-spin" />}
                    {status === 'complete' && <Check size={11} className="mr-1" />}
                    {status === 'failed' && <AlertCircle size={11} className="mr-1" />}
                    {meta.label}
                  </Badge>
                  {status === 'failed' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={retryingId === copy.id}
                      onClick={() => void handleRetry(copy.id)}
                    >
                      {retryingId === copy.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RefreshCw size={13} />
                      )}
                      Relancer
                    </Button>
                  )}
                </div>
              </div>
              {status === 'pending' && (
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">
                  {copy.content_text}
                </p>
              )}

              {(status === 'complete' || status === 'validated') && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Commentaire proposé par l&apos;agent
                    </p>
                    <textarea
                      value={comments[copy.id] ?? ''}
                      onChange={(event) =>
                        setComments((current) => ({ ...current, [copy.id]: event.target.value }))
                      }
                      readOnly={editingId !== copy.id}
                      rows={3}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none resize-y ${
                        editingId === copy.id
                          ? 'bg-background border-primary/40 focus:ring-2 focus:ring-primary/20'
                          : 'bg-muted/30 border-border'
                      }`}
                    />
                  </div>

                  {copy.findings.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Erreurs détectées</p>
                      <ul className="space-y-1.5">
                        {copy.findings.map((finding, index) => (
                          <li
                            key={index}
                            className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs space-y-1"
                          >
                            <Badge variant="outline" className="text-[10px]">
                              {FINDING_LABELS[finding.category]}
                            </Badge>
                            <p className="italic text-muted-foreground">« {finding.excerpt} »</p>
                            <p>{finding.suggestion}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {editingId === copy.id ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          className="gap-2 text-white"
                          style={{ backgroundColor: BRAND }}
                          disabled={validatingId === copy.id}
                          onClick={() => void handleValidate(copy.id, true)}
                        >
                          {validatingId === copy.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                          Enregistrer et valider
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setComments((current) => ({ ...current, [copy.id]: copy.comment ?? '' }))
                            setEditingId(null)
                          }}
                        >
                          Annuler
                        </Button>
                      </>
                    ) : (
                      <>
                        {status === 'complete' && (
                          <Button
                            type="button"
                            size="sm"
                            className="gap-2 text-white"
                            style={{ backgroundColor: BRAND }}
                            disabled={validatingId === copy.id}
                            onClick={() => void handleValidate(copy.id, false)}
                          >
                            {validatingId === copy.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Check size={13} />
                            )}
                            Valider
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => setEditingId(copy.id)}
                        >
                          <Pencil size={13} />
                          Modifier
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
