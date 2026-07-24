import AdaptationBuilder from '@/features/adaptation/components/AdaptationBuilder'
import { listAdaptationBuilderData } from '@/features/adaptation/server/adaptation.repository'
import { getCurrentTeacherProfile } from '@/features/profile/server/profile'
import type {
  AdaptationSourceOption,
  AdaptationStudentOption,
} from '@/features/adaptation/types/adaptation.types'

export const dynamic = 'force-dynamic'

export default async function NewAdaptationPage({
  searchParams,
}: {
  searchParams: Promise<{ sourceType?: string; sourceId?: string }>
}) {
  const query = await searchParams
  let sources: AdaptationSourceOption[] = []
  let students: AdaptationStudentOption[] = []
  let defaultSubject = ''
  let defaultLevel = ''

  try {
    const [data, profile] = await Promise.all([
      listAdaptationBuilderData(),
      getCurrentTeacherProfile(),
    ])
    sources = data.sources
    students = data.students
    defaultSubject = profile?.subjects?.[0] ?? profile?.subject ?? ''
    defaultLevel = profile?.levels?.[0] ?? ''
  } catch (error) {
    console.error('[adaptation] chargement du formulaire impossible', error)
  }

  const initialSourceType =
    query.sourceType === 'course' || query.sourceType === 'document'
      ? query.sourceType
      : undefined

  return (
    <AdaptationBuilder
      sources={sources}
      students={students}
      defaultSubject={defaultSubject}
      defaultLevel={defaultLevel}
      initialSourceType={initialSourceType}
      initialSourceId={query.sourceId}
    />
  )
}
