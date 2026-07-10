import { getCurrentTeacherProfile } from '@/features/profile/server/profile'
import QuizHistory from '@/features/quiz/components/QuizHistory'
import { listMyQuizzes } from '@/features/quiz/server/quiz'

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>
}) {
  const params = await searchParams
  const [profile, quizzes] = await Promise.all([getCurrentTeacherProfile(), listMyQuizzes()])
  const teacherName =
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Enseignant'

  return <QuizHistory quizzes={quizzes} teacherName={teacherName} deleted={params.deleted === '1'} />
}
