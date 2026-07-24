import { notFound } from 'next/navigation'
import SharedAdaptationView from '@/features/adaptation/components/SharedAdaptationView'
import { getSharedAdaptation } from '@/features/adaptation/server/adaptation.repository'

export const dynamic = 'force-dynamic'

export default async function SharedAdaptationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const adaptation = await getSharedAdaptation(token)
  if (!adaptation) notFound()

  return <SharedAdaptationView adaptation={adaptation} />
}
