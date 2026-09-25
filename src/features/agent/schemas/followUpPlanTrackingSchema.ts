import { z } from 'zod'
import { followUpPlanFinalItemSchema } from './followUpPlanSchema.ts'

export const followUpPlanItemStatusSchema = z.enum(['a_suivre', 'atteint', 'non_atteint'])
export type FollowUpPlanItemStatus = z.infer<typeof followUpPlanItemStatusSchema>

export const followUpPlanTrackedItemSchema = followUpPlanFinalItemSchema.extend({
  status: followUpPlanItemStatusSchema,
  revisionNote: z.string().trim().min(1).max(300).optional(),
})
export type FollowUpPlanTrackedItem = z.infer<typeof followUpPlanTrackedItemSchema>

export const followUpPlanRecordSchema = z.object({
  eleve: z.object({ nom: z.string().trim().min(1) }),
  statut: z.enum(['actif', 'termine']),
  items: z.array(followUpPlanTrackedItemSchema).min(1).max(10),
  bilan: z.string().trim().min(1).max(600).optional(),
})
export type FollowUpPlanRecord = z.infer<typeof followUpPlanRecordSchema>
