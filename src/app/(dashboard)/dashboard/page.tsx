import { getCurrentTeacherProfile } from '@/features/profile/server/profile'
import DashboardContent from './DashboardContent'

export default async function DashboardPage() {
  const profile = await getCurrentTeacherProfile()
  return <DashboardContent firstName={profile?.first_name ?? ''} />
}
