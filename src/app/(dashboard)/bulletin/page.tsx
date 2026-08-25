import BulletinGenerator from '@/features/bulletin/components/BulletinGenerator'
import { listMyClassesWithStudents } from '@/features/classroom/server/classroom.actions'

export const dynamic = 'force-dynamic'

export default async function BulletinPage() {
  // Precharge classes + eleves d'un coup : le select "eleve" n'a plus besoin
  // d'un aller-retour reseau au moment ou l'enseignant choisit une classe.
  const classes = await listMyClassesWithStudents()

  return <BulletinGenerator classes={classes} />
}
