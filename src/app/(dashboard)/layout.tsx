import { getCurrentTeacherProfile, profileToTeacherIdentity } from '@/features/profile/server/profile'
import { getUsage } from '@/features/billing/server/usage'
import { getSubscriptionSummary } from '@/features/billing/server/subscription'
import DashboardShell from '@/components/shared/DashboardShell'
import { AppLocaleProvider } from '@/features/i18n/AppLocaleProvider'
import OnboardingTour from '@/features/onboarding/components/OnboardingTour'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentTeacherProfile()
  const [usage, subscription] = profile
    ? await Promise.all([getUsage(profile.user_id), getSubscriptionSummary(profile.user_id)])
    : [{ used: 0, limit: 3 }, { plan: 'free' as const, interval: null, currentPeriodEnd: null, cancelAtPeriodEnd: false }]
  const teacher = profile
    ? await profileToTeacherIdentity(profile, {
        generationsUsed: usage.used,
        generationsLimit: usage.limit,
        plan: subscription.plan,
      })
    : null

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
