import StudyQuestionnaireBuilder from '@/features/adaptation/components/StudyQuestionnaireBuilder'
import { getCurrentTeacherProfile } from '@/features/profile/server/profile'

export const dynamic = 'force-dynamic'

export default async function StudyQuestionnairePage() {
  const profile = await getCurrentTeacherProfile()
  return (
    <StudyQuestionnaireBuilder
      defaultSubject={profile?.subjects?.[0] ?? profile?.subject ?? ''}
      defaultLevel={profile?.levels?.[0] ?? ''}
    />
  )
}
