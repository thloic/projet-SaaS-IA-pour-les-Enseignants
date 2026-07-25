import { notFound } from 'next/navigation'
import ClassDashboard from '@/features/classroom/components/ClassDashboard'
import { classroomPeriodSchema } from '@/features/classroom/schemas/classroomDashboardSchema'
import { getClassDashboard } from '@/features/classroom/server/classroomDashboard'

interface ClassDashboardPageProps {
  params: Promise<{ classId: string }>
  searchParams: Promise<{ tab?: string; period?: string }>
}

const TABS = ['overview', 'students', 'sessions', 'analytics'] as const

export const dynamic = 'force-dynamic'

export default async function ClassDashboardPage({
  params,
  searchParams,
}: ClassDashboardPageProps) {
  const { classId } = await params
  const query = await searchParams
  const activeTab = TABS.includes(query.tab as (typeof TABS)[number])
    ? (query.tab as (typeof TABS)[number])
    : 'overview'
  const periodResult = classroomPeriodSchema.safeParse(query.period)
  const period = periodResult.success ? periodResult.data : '30d'
  const data = await getClassDashboard(classId, period)
  if (!data) notFound()

  return <ClassDashboard data={data} activeTab={activeTab} />
}
