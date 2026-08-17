import { getCurrentTeacherProfile, profileToTeacherIdentity } from '@/features/profile/server/profile'
import DashboardShell from '@/components/shared/DashboardShell'
import { AppLocaleProvider } from '@/features/i18n/AppLocaleProvider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentTeacherProfile()
  const teacher = profile ? await profileToTeacherIdentity(profile) : null

  return (
    <AppLocaleProvider initialLocale={teacher?.interfaceLanguage ?? 'en'} restoreStoredLocale={false}>
      <DashboardShell teacher={teacher}>{children}</DashboardShell>
    </AppLocaleProvider>
  )
}
