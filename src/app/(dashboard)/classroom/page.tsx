import ClassroomHome from '@/features/classroom/components/ClassroomHome'
import { listClassroomOverview } from '@/features/classroom/server/classroomDashboard'
import { getCurrentTeacherProfile } from '@/features/profile/server/profile'

export const dynamic = 'force-dynamic'

export default async function ClassroomPage() {
  const [overviewResult, profile] = await Promise.all([
    listClassroomOverview().catch((error) => {
      console.error('[classroom] chargement de la page globale impossible', error)
      return null
    }),
    getCurrentTeacherProfile(),
  ])

  const data = overviewResult ?? {
    classes: [],
    metrics: {
      classCount: 0,
      studentCount: 0,
      attendanceRate: null,
      attentionCount: 0,
    },
  }

  return <ClassroomHome initialData={data} subjects={profile?.subjects ?? []} />
}
