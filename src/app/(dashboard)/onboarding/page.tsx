import { getCurrentUser, deriveNameFromUser } from '@/features/profile/server/profile'
import OnboardingForm from '@/features/profile/components/OnboardingForm'

export default async function OnboardingPage() {
  const user = await getCurrentUser()
  const { firstName, lastName } = user ? deriveNameFromUser(user) : { firstName: '', lastName: '' }

  return <OnboardingForm initialFirstName={firstName} initialLastName={lastName} />
}
