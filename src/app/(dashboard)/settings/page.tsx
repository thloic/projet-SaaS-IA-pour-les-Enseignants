import { getUsage } from '@/features/billing/server/usage'
import { getSubscriptionSummary } from '@/features/billing/server/subscription'
import { getCurrentUser, getCurrentTeacherProfile } from '@/features/profile/server/profile'
import SettingsForm from '@/features/profile/components/SettingsForm'
import { normalizeGradingSystem } from '@/features/profile/types/profile.types'

export default async function SettingsPage() {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentTeacherProfile()])
  const [usage, subscription] = await Promise.all([
    user ? getUsage(user.id) : Promise.resolve({ used: 0, limit: 3 }),
    user
      ? getSubscriptionSummary(user.id)
      : Promise.resolve({ plan: 'free' as const, interval: null, currentPeriodEnd: null, cancelAtPeriodEnd: false }),
  ])

  return (
    <SettingsForm
      initialFirstName={profile?.first_name ?? ''}
      initialLastName={profile?.last_name ?? ''}
      initialEmail={user?.email ?? ''}
      initialCountry={profile?.country ?? ''}
      initialSubjects={
        profile?.subjects?.length
          ? profile.subjects
          : profile?.subject
            ? [profile.subject]
            : ['Mathématiques']
      }
      initialGradingSystem={normalizeGradingSystem(profile?.grading_system)}
      initialLanguage={profile?.language ?? 'fr'}
      initialInterfaceLanguage={profile?.interface_language ?? profile?.language ?? 'fr'}
      initialTimezone={profile?.timezone ?? 'UTC'}
      generationsUsed={usage.used}
      generationsLimit={usage.limit}
      subscription={subscription}
    />
  )
}
