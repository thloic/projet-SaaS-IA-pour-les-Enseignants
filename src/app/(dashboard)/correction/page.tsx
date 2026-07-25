import Link from 'next/link'
import { CheckCheck, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listMyCorrectionBatches } from '@/features/correction/server/correction.actions'
import type { CorrectionBatch } from '@/features/correction/types/correction.types'

export const dynamic = 'force-dynamic'

const BRAND = '#534AB7'

const STATUS_LABEL: Record<CorrectionBatch['status'], string> = {
  draft: 'Brouillon',
  generating: 'En cours',
  partial: 'Partiel',
  complete: 'Terminé',
}

const STATUS_CLASS: Record<CorrectionBatch['status'], string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  generating: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-300',
  partial: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-300',
  complete: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-300',
}

export default async function CorrectionPage() {
  const batches = await listMyCorrectionBatches()

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20 lg:pb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-primary/10">
            <CheckCheck size={22} style={{ color: BRAND }} />
          </div>
          <div>
            <h1 className="text-2xl font-black">Correction IA</h1>
            <p className="text-sm text-muted-foreground">Corrigez les copies d&apos;une classe en un lot</p>
          </div>
        </div>
        <Button asChild className="gap-2 text-white" style={{ backgroundColor: BRAND }}>
          <Link href="/correction/new">
            <Plus size={16} /> Nouveau lot
          </Link>
        </Button>
      </div>

      {batches.length === 0 ? (
        <div className="rounded-2xl border border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          Aucun lot de correction pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <Link
              key={batch.id}
              href={`/correction/${batch.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/40 p-4 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="font-semibold truncate">{batch.className}</p>
                <p className="text-xs text-muted-foreground">
                  {batch.copyCount} copie(s) · {new Date(batch.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <Badge className={`shrink-0 ${STATUS_CLASS[batch.status]}`} variant="outline">
                {STATUS_LABEL[batch.status]}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
