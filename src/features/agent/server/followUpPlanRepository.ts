import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import {
  followUpPlanRecordSchema,
  type FollowUpPlanRecord,
} from '@/features/agent/schemas/followUpPlanTrackingSchema'

export async function saveNewFollowUpPlan(input: {
  studentId: string
  classId: string | null
  record: FollowUpPlanRecord
}): Promise<{ id: string }> {
  const user = await getCurrentUser()
  if (!user) throw new Error('AUTH_REQUIRED')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('follow_up_plans')
    .insert({
      user_id: user.id,
      student_id: input.studentId,
      class_id: input.classId,
      statut: input.record.statut,
      plan: input.record,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[agent:follow-up-plan] sauvegarde refusée', error)
    throw new Error('FOLLOW_UP_PLAN_SAVE_FAILED')
  }
  return { id: data.id }
}

// Le plan actif le plus recent d'un eleve : un seul plan de suivi "en cours"
// a la fois a un sens produit (des plans clotures peuvent s'accumuler dans le temps).
export async function getActiveFollowUpPlanForStudent(
  studentId: string
): Promise<{ id: string; record: FollowUpPlanRecord } | null> {
  const user = await getCurrentUser()
  if (!user) throw new Error('AUTH_REQUIRED')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('follow_up_plans')
    .select('id, plan')
    .eq('user_id', user.id)
    .eq('student_id', studentId)
    .eq('statut', 'actif')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[agent:follow-up-plan] lecture refusée', error)
    throw new Error('FOLLOW_UP_PLAN_LOAD_FAILED')
  }
  if (!data) return null

  const parsed = followUpPlanRecordSchema.safeParse(data.plan)
  return parsed.success ? { id: data.id, record: parsed.data } : null
}

// Met a jour le plan actif d'un eleve (bilan de revision) sans avoir besoin de
// son id : au plus un plan actif existe a la fois par eleve, le filtre
// statut = 'actif' cible donc exactement la ligne resolue par
// getActiveFollowUpPlanForStudent juste avant.
export async function updateActiveFollowUpPlanForStudent(
  userId: string,
  studentId: string,
  record: FollowUpPlanRecord
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('follow_up_plans')
    .update({ statut: record.statut, plan: record })
    .eq('user_id', userId)
    .eq('student_id', studentId)
    .eq('statut', 'actif')

  if (error) {
    console.error('[agent:follow-up-plan] mise à jour du bilan refusée', error)
    throw new Error('FOLLOW_UP_PLAN_UPDATE_FAILED')
  }
}

export async function getFollowUpPlanForUser(userId: string, planId: string): Promise<FollowUpPlanRecord | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('follow_up_plans')
    .select('plan')
    .eq('user_id', userId)
    .eq('id', planId)
    .maybeSingle()

  if (error) {
    console.error('[agent:follow-up-plan] lecture refusée', error)
    throw new Error('FOLLOW_UP_PLAN_LOAD_FAILED')
  }
  if (!data) return null

  const parsed = followUpPlanRecordSchema.safeParse(data.plan)
  return parsed.success ? parsed.data : null
}

export async function updateFollowUpPlanForUser(
  userId: string,
  planId: string,
  record: FollowUpPlanRecord
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('follow_up_plans')
    .update({ statut: record.statut, plan: record })
    .eq('user_id', userId)
    .eq('id', planId)

  if (error) {
    console.error('[agent:follow-up-plan] mise à jour refusée', error)
    throw new Error('FOLLOW_UP_PLAN_UPDATE_FAILED')
  }
}
