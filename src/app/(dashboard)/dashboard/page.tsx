import { getCurrentTeacherProfile } from '@/features/profile/server/profile'
import { listMyQuizzes } from '@/features/quiz/server/quiz'
import DashboardContent from './DashboardContent'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; deleted?: string }>
}) {
  const params = await searchParams
  const [profile, quizzes] = await Promise.all([getCurrentTeacherProfile(), listMyQuizzes()])
  const teacherName =
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Enseignant'

  return (
    <DashboardContent
      firstName={profile?.first_name ?? ''}
      teacherName={teacherName}
      recentQuizzes={quizzes}
      showWelcome={params.welcome === '1'}
      showDeletedFeedback={params.deleted === '1'}
    />
  )
}
