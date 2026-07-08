import { notFound } from 'next/navigation'
import { getCurrentTeacherProfile } from '@/features/profile/server/profile'
import QuizViewer from '@/features/quiz/components/QuizViewer'
import { getMyQuiz } from '@/features/quiz/server/quiz'

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const quiz = await getMyQuiz(id)
  const profile = await getCurrentTeacherProfile()
  const teacherName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Enseignant'

  if (!quiz) {
    notFound()
  }

  return <QuizViewer quiz={quiz} teacherName={teacherName} />
}
