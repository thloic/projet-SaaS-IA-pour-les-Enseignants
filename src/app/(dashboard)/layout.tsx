import { getCurrentTeacherProfile, profileToTeacherIdentity } from '@/features/profile/server/profile'
import DashboardShell from '@/components/shared/DashboardShell'
import { AppLocaleProvider } from '@/features/i18n/AppLocaleProvider'
import OnboardingTour from '@/features/onboarding/components/OnboardingTour'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentTeacherProfile()
  const teacher = profile ? await profileToTeacherIdentity(profile) : null

  return (
    <AppLocaleProvider
      initialLocale={teacher?.interfaceLanguage ?? 'en'}
      restoreStoredLocale={false}
      timeZone={profile?.timezone ?? 'UTC'}
    >
      <DashboardShell teacher={teacher}>{children}</DashboardShell>
      {profile?.onboarding_tour_seen === false && (
        <OnboardingTour locale={profile.interface_language} />
      )}
    </AppLocaleProvider>
  )
}
