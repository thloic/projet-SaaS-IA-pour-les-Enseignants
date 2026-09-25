import ExamVariantBuilder from '@/features/adaptation/components/ExamVariantBuilder'
import { getCurrentTeacherProfile } from '@/features/profile/server/profile'

export const dynamic = 'force-dynamic'

export default async function ExamVariantsPage() {
  const profile = await getCurrentTeacherProfile()
  return (
    <ExamVariantBuilder
      defaultSubject={profile?.subjects?.[0] ?? profile?.subject ?? ''}
      defaultLevel={profile?.levels?.[0] ?? ''}
    />
  )
}
