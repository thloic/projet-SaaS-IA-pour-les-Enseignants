import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CorrectionBatchForm from '@/features/correction/components/CorrectionBatchForm'
import { listMyClassesWithStudents } from '@/features/classroom/server/classroom.actions'

export const dynamic = 'force-dynamic'

export default async function NewCorrectionBatchPage() {
  // Precharge classes + eleves d'un coup : plus d'aller-retour reseau quand
  // l'enseignant change de classe dans le formulaire.
  const classes = await listMyClassesWithStudents()

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20 lg:pb-6">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/correction">
            <ArrowLeft size={15} /> Retour
          </Link>
        </Button>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-black">Nouveau lot de correction</h1>
        <p className="text-sm text-muted-foreground">
          Choisissez une classe, puis apportez la copie de chaque élève.
        </p>
      </header>

      <CorrectionBatchForm classes={classes} />
    </div>
  )
}
