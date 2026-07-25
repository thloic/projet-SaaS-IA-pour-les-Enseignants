import { notFound } from 'next/navigation'
import ClassDetail from '@/features/classroom/components/ClassDetail'
import { getClassManagementData } from '@/features/classroom/server/classroomDashboard'

interface StudentsPageProps {
  params: Promise<{ classId: string }>
}

export default async function StudentsPage({ params }: StudentsPageProps) {
  const { classId } = await params
  const data = await getClassManagementData(classId)
  if (!data) notFound()

  return (
    <ClassDetail
      classId={classId}
      backHref={`/classroom/${classId}`}
      backLabel="Retour au tableau de bord"
      initialClassroom={data.classroom}
      initialStudents={data.students}
    />
  )
}
