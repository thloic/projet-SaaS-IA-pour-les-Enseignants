import CourseGenerationForm from '@/features/generation/components/CourseGenerationForm'
import { listMyCourses, type CourseListItem } from '@/features/generation/server/courses'
import { getCurrentTeacherProfile } from '@/features/profile/server/profile'

export const dynamic = 'force-dynamic'

export default async function GeneratePage() {
  let subjects: string[] = []
  let levels: string[] = []
  let courses: CourseListItem[] = []

  try {
    const [profile, recentCourses] = await Promise.all([getCurrentTeacherProfile(), listMyCourses()])
    subjects = profile?.subjects?.length ? profile.subjects : [profile?.subject].filter(Boolean) as string[]
    levels = profile?.levels ?? []
    courses = recentCourses
  } catch (error) {
    console.error('[courses] chargement page generation impossible', error)
  }

  return <CourseGenerationForm subjects={subjects} levels={levels} courses={courses} />
}
