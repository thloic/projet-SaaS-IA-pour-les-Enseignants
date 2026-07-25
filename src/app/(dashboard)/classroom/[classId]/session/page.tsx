import { notFound } from 'next/navigation'
import ClassSessionPage from '@/features/classroom/components/ClassSessionPage'
import { getOrCreateClassSession } from '@/features/classroom/server/classroomDashboard'

interface SessionPageProps {
  params: Promise<{ classId: string }>
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { classId } = await params
  const data = await getOrCreateClassSession(classId)
  if (!data) notFound()

  return <ClassSessionPage classId={classId} initialData={data} />
}
