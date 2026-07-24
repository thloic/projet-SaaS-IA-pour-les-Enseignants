import { notFound } from 'next/navigation'
import AdaptationDetailView from '@/features/adaptation/components/AdaptationDetailView'
import { getMyAdaptation } from '@/features/adaptation/server/adaptation.repository'

export const dynamic = 'force-dynamic'

export default async function AdaptationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adaptation = await getMyAdaptation(id)
  if (!adaptation) notFound()

  return <AdaptationDetailView adaptation={adaptation} />
}
