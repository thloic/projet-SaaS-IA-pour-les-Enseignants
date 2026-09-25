'use server'

import { getCurrentUser } from '@/features/profile/server/profile'
import { getFollowUpPlanForUser, updateFollowUpPlanForUser } from './followUpPlanRepository'
import { updateFollowUpPlanStatus } from './followUpPlanStatusService'
import type { FollowUpPlanItemStatus, FollowUpPlanRecord } from '../schemas/followUpPlanTrackingSchema'

export interface FollowUpPlanTrackingMutationResult {
  data: FollowUpPlanRecord | null
  error: 'PLAN_NOT_FOUND' | 'ITEM_NOT_FOUND' | 'AUTH_REQUIRED' | null
}

// Action UI (bouton par objectif) — jamais une intention de chat : voir la
// decision d'architecture dans TECHPLAN-suivi-atteinte-objectifs.md, phase B.
export async function updateFollowUpPlanItemStatusAction(input: {
  planId: string
  sourceId: string
  status: FollowUpPlanItemStatus
  revisionNote?: string
}): Promise<FollowUpPlanTrackingMutationResult> {
  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'AUTH_REQUIRED' }

  const result = await updateFollowUpPlanStatus(
    {
      userId: user.id,
      planId: input.planId,
      sourceId: input.sourceId,
      status: input.status,
      ...(input.revisionNote ? { revisionNote: input.revisionNote } : {}),
    },
    { getPlanForUser: getFollowUpPlanForUser, savePlan: updateFollowUpPlanForUser }
  )

  if (result.kind === 'plan_not_found') return { data: null, error: 'PLAN_NOT_FOUND' }
  if (result.kind === 'item_not_found') return { data: null, error: 'ITEM_NOT_FOUND' }
  return { data: result.record, error: null }
}
