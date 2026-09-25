import { z } from 'zod'

export const followUpPlanReviewGeneratedSchema = z.object({
  bilan: z.string().trim().min(1).max(600),
})
export type FollowUpPlanReviewGenerated = z.infer<typeof followUpPlanReviewGeneratedSchema>
