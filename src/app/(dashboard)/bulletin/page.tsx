import BulletinGenerator from '@/features/bulletin/components/BulletinGenerator'
import { listMyBulletins, type BulletinCommentListItem } from '@/features/bulletin/server/bulletin.actions'

export const dynamic = 'force-dynamic'

export default async function BulletinPage() {
  let bulletins: BulletinCommentListItem[] = []
  let loadError: string | null = null

  try {
    bulletins = await listMyBulletins()
  } catch (error) {
    console.error('[bulletin] chargement page impossible', error)
    loadError = 'Impossible de charger vos commentaires pour le moment.'
  }

  return <BulletinGenerator initialBulletins={bulletins} loadError={loadError} />
}
