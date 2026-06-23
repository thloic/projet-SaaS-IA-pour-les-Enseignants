import { getCurrentUser, getCurrentTeacherProfile } from '@/features/profile/server/profile'
import SettingsForm from '@/features/profile/components/SettingsForm'

export default async function SettingsPage() {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentTeacherProfile()])

  return (
    <SettingsForm
      initialFirstName={profile?.first_name ?? ''}
      initialLastName={profile?.last_name ?? ''}
      initialEmail={user?.email ?? ''}
      initialCountry={profile?.country ?? ''}
      initialSubject={profile?.subject ?? ''}
      initialGradingSystem={profile?.grading_system ?? '20'}
      initialLanguage={profile?.language ?? 'fr'}
      generationsUsed={0}
      generationsLimit={3}
    />
  )
}
