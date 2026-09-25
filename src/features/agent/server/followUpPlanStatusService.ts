import type { FollowUpPlanItemStatus, FollowUpPlanRecord } from '../schemas/followUpPlanTrackingSchema.ts'
import { updateFollowUpPlanItemStatus } from './followUpPlanTracking.ts'

export interface FollowUpPlanStatusRepository {
  getPlanForUser(userId: string, planId: string): Promise<FollowUpPlanRecord | null>
  savePlan(userId: string, planId: string, record: FollowUpPlanRecord): Promise<void>
}

export type UpdateFollowUpPlanStatusResult =
  | { kind: 'updated'; record: FollowUpPlanRecord }
  | { kind: 'item_not_found' }
  | { kind: 'plan_not_found' }

// Le repository filtre deja par userId (RLS + filtrage explicite, defense en
// profondeur) : un plan qui n'appartient pas a l'enseignant courant revient
// simplement introuvable, jamais une fuite d'un autre dossier eleve.
export async function updateFollowUpPlanStatus(
  input: {
    userId: string
    planId: string
    sourceId: string
    status: FollowUpPlanItemStatus
    revisionNote?: string
  },
  repository: FollowUpPlanStatusRepository
): Promise<UpdateFollowUpPlanStatusResult> {
  const record = await repository.getPlanForUser(input.userId, input.planId)
  if (!record) return { kind: 'plan_not_found' }

  const result = updateFollowUpPlanItemStatus(record, {
    sourceId: input.sourceId,
    status: input.status,
    ...(input.revisionNote ? { revisionNote: input.revisionNote } : {}),
  })
  if (result.kind === 'item_not_found') return result

  await repository.savePlan(input.userId, input.planId, result.record)
  return result
}
