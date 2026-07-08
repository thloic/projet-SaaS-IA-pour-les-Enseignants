import { ClipboardList } from 'lucide-react'
import { listMyDocuments } from '@/features/documents/server/document'
import type { SourceDocumentListItem } from '@/features/documents/types/document.types'
import { getCurrentTeacherProfile } from '@/features/profile/server/profile'
import QuizGeneratorForm from '@/features/quiz/components/QuizGeneratorForm'
import QuizList from '@/features/quiz/components/QuizList'
import QuizPageFeedback from '@/features/quiz/components/QuizPageFeedback'
import { listMyQuizzes } from '@/features/quiz/server/quiz'
import type { QuizListItem } from '@/features/quiz/types/quiz.types'

const BRAND = '#534AB7'

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
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl"
          style={{ backgroundColor: `${BRAND}20` }}
        >
          <ClipboardList size={20} style={{ color: BRAND }} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-black sm:text-2xl">Quiz & QCM</h1>
          <p className="text-sm text-muted-foreground">
            Générez un quiz à partir d’un document source ou d’un texte collé.
          </p>
        </div>
      </div>

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
        <h2 className="text-sm font-semibold text-muted-foreground">
          {quizzes.length === 0
            ? 'Aucun quiz généré pour l’instant'
            : `${quizzes.length} quiz récent${quizzes.length > 1 ? 's' : ''}`}
        </h2>

        <QuizList quizzes={quizzes} teacherName={teacherName} />
      </section>
    </div>
  )
}
