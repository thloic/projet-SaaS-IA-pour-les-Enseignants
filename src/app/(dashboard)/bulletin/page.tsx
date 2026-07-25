import BulletinGenerator from '@/features/bulletin/components/BulletinGenerator'
import { listMyBulletins, type BulletinCommentListItem } from '@/features/bulletin/server/bulletin.actions'
import { listMyClassesWithStudents } from '@/features/classroom/server/classroom.actions'

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

  // Precharge classes + eleves d'un coup : le select "eleve" n'a plus besoin
  // d'un aller-retour reseau au moment ou l'enseignant choisit une classe.
  const classes = await listMyClassesWithStudents()

  return <BulletinGenerator initialBulletins={bulletins} loadError={loadError} classes={classes} />
}
