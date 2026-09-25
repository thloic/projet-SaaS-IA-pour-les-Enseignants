import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import { getClassDashboardForUser } from '@/features/classroom/server/classroomDashboard'
import { buildClassContext } from './classContextCore'
import { createClassContextRepository } from './classContextRepository'
import type { OwnedClassRecord } from '../types/classContext.types'
import type { GradingSystem } from '@/features/profile/types/profile.types'

async function authenticatedUserId() {
  const user = await getCurrentUser()
  if (!user) throw new Error('AUTH_REQUIRED')
  return user.id
}

export async function listOwnedClasses(): Promise<OwnedClassRecord[]> {
  const userId = await authenticatedUserId()
  const supabase = await createClient()
  return createClassContextRepository(supabase).listOwnedClasses(userId)
}

export async function getClassContext(classId: string, system: GradingSystem) {
  const userId = await authenticatedUserId()
  const dashboard = await getClassDashboardForUser(classId, '30d', userId)
  if (!dashboard) throw new Error('CLASS_NOT_FOUND')
  const supabase = await createClient()
  const repository = createClassContextRepository(supabase)
  const rows = await repository.listEvaluationGrades(userId, classId)
  const correctionRows = await repository.listCorrectionFindings(userId, classId)
  return buildClassContext(dashboard, rows, system, correctionRows)
}
