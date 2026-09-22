import { z } from 'zod'

// sourceId : identifiant que le modele choisit parmi les preuves reelles fournies
// (observation ou adaptation institutionnelle), jamais un texte libre — voir
// generateFollowUpPlan.ts pour l'ancrage anti-hallucination.
export const followUpPlanItemSchema = z.object({
  sourceId: z.string().trim().min(1),
  constat: z.string().trim().min(1).max(300),
  objectif: z.string().trim().min(1).max(300),
  prochaineEtape: z.string().trim().min(1).max(300),
})

export const followUpPlanGeneratedSchema = z.object({
  items: z.array(followUpPlanItemSchema).min(1).max(10),
})

// source : texte reel reconstruit a partir du sourceId, jamais celui propose par le modele.
export const followUpPlanFinalItemSchema = followUpPlanItemSchema.extend({
  source: z.string().trim().min(1),
})

export const followUpPlanSchema = z.object({
  eleve: z.object({ nom: z.string().trim().min(1) }),
  items: z.array(followUpPlanFinalItemSchema).min(1).max(10),
})

export type FollowUpPlanItem = z.infer<typeof followUpPlanItemSchema>
export type FollowUpPlanGenerated = z.infer<typeof followUpPlanGeneratedSchema>
export type FollowUpPlanFinalItem = z.infer<typeof followUpPlanFinalItemSchema>
export type FollowUpPlan = z.infer<typeof followUpPlanSchema>
