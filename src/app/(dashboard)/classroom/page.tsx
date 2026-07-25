import ClassroomHome from '@/features/classroom/components/ClassroomHome'
import { listClassroomOverview } from '@/features/classroom/server/classroomDashboard'

export const dynamic = 'force-dynamic'

export default async function ClassroomPage() {
  let data
  try {
    data = await listClassroomOverview()
  } catch (error) {
    console.error('[classroom] chargement de la page globale impossible', error)
    data = {
      classes: [],
      metrics: {
        classCount: 0,
        studentCount: 0,
        attendanceRate: null,
        attentionCount: 0,
      },
    }
  }

  return <ClassroomHome initialData={data} />
}
