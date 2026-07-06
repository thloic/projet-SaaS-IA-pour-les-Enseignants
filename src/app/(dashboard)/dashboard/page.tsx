import { getCurrentTeacherProfile } from '@/features/profile/server/profile'
import DashboardContent from './DashboardContent'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>
}) {
  const params = await searchParams
  const profile = await getCurrentTeacherProfile()
  return (
    <DashboardContent
      firstName={profile?.first_name ?? ''}
      showWelcome={params.welcome === '1'}
    />
  )
}
