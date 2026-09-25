import type { FollowUpPlan } from '../schemas/followUpPlanSchema.ts'
import {
  followUpPlanRecordSchema,
  type FollowUpPlanItemStatus,
  type FollowUpPlanRecord,
} from '../schemas/followUpPlanTrackingSchema.ts'

export type { FollowUpPlanRecord, FollowUpPlanItemStatus } from '../schemas/followUpPlanTrackingSchema.ts'

// Un brouillon valide (Phase 3) devient un plan suivi dans le temps : chaque item
// part de "a_suivre", jamais d'un statut pre-rempli qui presumerait de l'atteinte
// d'un objectif que l'enseignant n'a pas encore evalue.
export function adoptFollowUpPlan(plan: FollowUpPlan): FollowUpPlanRecord {
  return followUpPlanRecordSchema.parse({
    eleve: plan.eleve,
    statut: 'actif',
    items: plan.items.map((item) => ({ ...item, status: 'a_suivre' as const })),
  })
}

export type UpdateFollowUpPlanItemStatusResult =
  | { kind: 'updated'; record: FollowUpPlanRecord }
  | { kind: 'item_not_found' }

// Fonction pure : ne modifie jamais l'objet recu, ne touche qu'a l'item vise par
// sourceId. Un sourceId inconnu est une reponse explicite, jamais une exception —
// l'appelant (service/orchestration) decide comment le signaler.
export function updateFollowUpPlanItemStatus(
  record: FollowUpPlanRecord,
  input: { sourceId: string; status: FollowUpPlanItemStatus; revisionNote?: string }
): UpdateFollowUpPlanItemStatusResult {
  const itemIndex = record.items.findIndex((item) => item.sourceId === input.sourceId)
  if (itemIndex === -1) return { kind: 'item_not_found' }

  const items = record.items.map((item, index) =>
    index === itemIndex
      ? {
          ...item,
          status: input.status,
          ...(input.revisionNote ? { revisionNote: input.revisionNote } : {}),
        }
      : item
  )

  return { kind: 'updated', record: followUpPlanRecordSchema.parse({ ...record, items }) }
}

export function isFollowUpPlanReadyForReview(record: FollowUpPlanRecord): boolean {
  return record.items.every((item) => item.status !== 'a_suivre')
}

export interface FollowUpPlanProgressSummary {
  atteints: number
  nonAtteints: number
  aSuivre: number
  total: number
}

export function summarizeFollowUpPlanProgress(record: FollowUpPlanRecord): FollowUpPlanProgressSummary {
  return {
    atteints: record.items.filter((item) => item.status === 'atteint').length,
    nonAtteints: record.items.filter((item) => item.status === 'non_atteint').length,
    aSuivre: record.items.filter((item) => item.status === 'a_suivre').length,
    total: record.items.length,
  }
}

export type FollowUpPlanReviewErrorCode = 'PLAN_NOT_READY'

export class FollowUpPlanReviewError extends Error {
  readonly code: FollowUpPlanReviewErrorCode

  constructor(code: FollowUpPlanReviewErrorCode) {
    super(code)
    this.name = 'FollowUpPlanReviewError'
    this.code = code
  }
}

// Jamais de bilan sur un plan encore partiellement evalue : forcerait un jugement
// IA sur un objectif que l'enseignant n'a pas lui-meme statue.
export function closeFollowUpPlan(record: FollowUpPlanRecord, bilan: string): FollowUpPlanRecord {
  if (!isFollowUpPlanReadyForReview(record)) {
    throw new FollowUpPlanReviewError('PLAN_NOT_READY')
  }
  return followUpPlanRecordSchema.parse({ ...record, statut: 'termine', bilan })
}
