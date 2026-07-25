import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCorrectionBatch } from '@/features/correction/server/correction.actions'
import CorrectionBatchDetail from '@/features/correction/components/CorrectionBatchDetail'
import type { CorrectionBatch } from '@/features/correction/types/correction.types'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<CorrectionBatch['status'], string> = {
  draft: 'Brouillon',
  generating: 'En cours',
  partial: 'Partiel',
  complete: 'Terminé',
}

export default async function CorrectionBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>
}) {
  const { batchId } = await params
  const detail = await getCorrectionBatch(batchId)

  if (!detail) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20 lg:pb-6">
      <Button asChild variant="outline" size="sm">
        <Link href="/correction">
          <ArrowLeft size={15} /> Retour aux lots
        </Link>
      </Button>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{detail.className}</Badge>
          <Badge variant="outline">{STATUS_LABEL[detail.batch.status]}</Badge>
        </div>
        <h1 className="text-2xl font-black">Lot de correction — {detail.className}</h1>
        <p className="text-sm text-muted-foreground">{detail.copies.length} copie(s) importée(s).</p>
      </header>

      <CorrectionBatchDetail detail={detail} />
    </div>
  )
}
