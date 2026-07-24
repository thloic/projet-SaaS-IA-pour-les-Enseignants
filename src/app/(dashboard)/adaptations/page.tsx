import AdaptationLibrary from '@/features/adaptation/components/AdaptationLibrary'
import { listMyAdaptations } from '@/features/adaptation/server/adaptation.repository'
import type { AdaptationListItem } from '@/features/adaptation/types/adaptation.types'

export const dynamic = 'force-dynamic'

export default async function AdaptationsPage() {
  let adaptations: AdaptationListItem[] = []
  try {
    adaptations = await listMyAdaptations()
  } catch (error) {
    console.error('[adaptation] chargement de la page impossible', error)
  }

  return <AdaptationLibrary adaptations={adaptations} />
}
