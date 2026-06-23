import { getCurrentTeacherProfile, profileToTeacherIdentity } from '@/features/profile/server/profile'
import DashboardShell from '@/components/shared/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentTeacherProfile()
  const teacher = profile ? profileToTeacherIdentity(profile) : null

  return <DashboardShell teacher={teacher}>{children}</DashboardShell>
}
