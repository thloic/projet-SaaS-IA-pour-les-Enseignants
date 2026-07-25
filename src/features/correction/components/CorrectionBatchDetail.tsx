'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/shared/ToastProvider'
import { retryCorrectionCopyAction } from '@/features/correction/server/correction.actions'
import type { CorrectionTone } from '@/features/correction/schemas/correctionSchema'
import type { CorrectionBatchDetail as CorrectionBatchDetailData } from '@/features/correction/server/correction.actions'
import type { CorrectionCopyStatus } from '@/features/correction/types/correction.types'

const BRAND = '#534AB7'

const TONES: { value: CorrectionTone; label: string; desc: string }[] = [
  { value: 'encourageant', label: 'Encourageant', desc: 'Motive, met en avant les progrès' },
  { value: 'factuel', label: 'Factuel', desc: 'Sobre, centré sur les observations' },
  { value: 'direct', label: 'Direct', desc: 'Clair et concis' },
]

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
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const total = detail.copies.length
  const doneCount = useMemo(
    () => Object.values(statuses).filter((status) => status === 'complete' || status === 'validated').length,
    [statuses]
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
            {isLaunching ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
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
          <p className="text-xs text-muted-foreground">{doneCount} sur {total} copie(s) traitée(s)</p>
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
            </article>
          )
        })}
      </div>
    </div>
  )
}
