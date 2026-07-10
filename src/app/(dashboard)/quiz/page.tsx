import { listMyDocuments } from '@/features/documents/server/document'
import type { SourceDocumentListItem } from '@/features/documents/types/document.types'
import { getCurrentTeacherProfile } from '@/features/profile/server/profile'
import QuizGeneratorForm from '@/features/quiz/components/QuizGeneratorForm'
import QuizList from '@/features/quiz/components/QuizList'
import QuizListHeading from '@/features/quiz/components/QuizListHeading'
import QuizPageIntro from '@/features/quiz/components/QuizPageIntro'
import QuizPageFeedback from '@/features/quiz/components/QuizPageFeedback'
import { listMyQuizzes } from '@/features/quiz/server/quiz'
import type { QuizListItem } from '@/features/quiz/types/quiz.types'

export default async function QuizIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ sourceDocumentId?: string; deleted?: string }>
}) {
  const params = await searchParams
  let documents: SourceDocumentListItem[] = []
  let quizzes: QuizListItem[] = []
  let teacherName = 'Enseignant'
  let subjects: string[] = []
  let loadError: string | null = null

  try {
    const profile = await getCurrentTeacherProfile()
    const name = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()
    teacherName = name || 'Enseignant'
    subjects = profile?.subjects?.length ? profile.subjects : [profile?.subject].filter(Boolean) as string[]
    documents = await listMyDocuments()
    quizzes = await listMyQuizzes()
  } catch (error) {
    console.error('[quiz] chargement page impossible', error)
    loadError = 'Impossible de charger tous vos éléments pour le moment.'
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-1 pb-20 sm:space-y-8 sm:px-0 lg:pb-6">
      <QuizPageFeedback deleted={params.deleted === '1'} />
      <QuizPageIntro />

      {loadError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-200">
          {loadError}
        </div>
      )}

      <QuizGeneratorForm
        documents={documents}
        defaultSourceDocumentId={params.sourceDocumentId}
        subjects={subjects}
      />

      <section className="space-y-3">
        <QuizListHeading count={quizzes.length} />

        <QuizList quizzes={quizzes} teacherName={teacherName} />
      </section>
    </div>
  )
}
