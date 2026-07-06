import { getCurrentUser, getCurrentTeacherProfile } from '@/features/profile/server/profile'
import SettingsForm from '@/features/profile/components/SettingsForm'
import { normalizeGradingSystem } from '@/features/profile/types/profile.types'

export default async function SettingsPage() {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentTeacherProfile()])

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
      generationsUsed={0}
      generationsLimit={3}
    />
  )
}
