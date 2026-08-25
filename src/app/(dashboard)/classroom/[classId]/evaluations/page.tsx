import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import EvaluationResultsGrid from '@/features/classroom/components/EvaluationResultsGrid'
import { getClassManagementData } from '@/features/classroom/server/classroomDashboard'
import { listClassEvaluationResults } from '@/features/classroom/server/evaluationResults.actions'
import { getCurrentTeacherProfile } from '@/features/profile/server/profile'

interface EvaluationsPageProps {
  params: Promise<{ classId: string }>
}

export const dynamic = 'force-dynamic'

export default async function EvaluationsPage({ params }: EvaluationsPageProps) {
  const { classId } = await params
  const [classData, results, profile] = await Promise.all([
    getClassManagementData(classId),
    listClassEvaluationResults(classId),
    getCurrentTeacherProfile(),
  ])
  if (!classData || !profile) notFound()

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-24 lg:pb-8">
      <header>
        <Button asChild variant="ghost" className="-ml-2 mb-2">
          <Link href={`/classroom/${classId}`}><ArrowLeft /> Retour à la classe</Link>
        </Button>
        <h1 className="text-2xl font-black sm:text-3xl">Carnet de résultats</h1>
        <p className="text-sm text-muted-foreground">{classData.classroom.name} · {classData.classroom.level}</p>
      </header>
      <EvaluationResultsGrid
        classId={classId}
        students={classData.students}
        initialResults={results}
        gradingSystem={profile.grading_system}
      />
    </main>
  )
}
