import { z } from 'zod'

export const correctionCopyInputSchema = z.object({
  studentId: z.string().uuid(),
  contentText: z.string().trim().min(1).max(30000),
})

export const createCorrectionBatchSchema = z.object({
  classId: z.string().uuid('Sélectionnez une classe.'),
  copies: z
    .array(correctionCopyInputSchema)
    .min(1, 'Ajoutez au moins une copie avant de continuer.'),
})

// Distinct du ton du bulletin (bienveillant/encourageant/factuel) : repris tel
// quel de la fiche 15 du cahier des charges pour le module Correction IA.
export const correctionToneSchema = z.enum(['encourageant', 'factuel', 'direct'])

export const correctionFindingCategorySchema = z.enum(['syntaxe', 'comprehension', 'methode'])

export const launchCorrectionBatchSchema = z.object({
  batchId: z.string().uuid(),
  tone: correctionToneSchema,
})

export const generatedCorrectionSchema = z.object({
  findings: z
    .array(
      z.object({
        category: correctionFindingCategorySchema,
        excerpt: z.string().trim().min(1).max(300),
        suggestion: z.string().trim().min(1).max(500),
      })
    )
    .max(20),
  comment: z.string().trim().min(30, 'Le commentaire généré est trop court.'),
})

export type CorrectionCopyInput = z.infer<typeof correctionCopyInputSchema>
export type CreateCorrectionBatchInput = z.infer<typeof createCorrectionBatchSchema>
export type CorrectionTone = z.infer<typeof correctionToneSchema>
export type CorrectionFindingCategory = z.infer<typeof correctionFindingCategorySchema>
export type LaunchCorrectionBatchInput = z.infer<typeof launchCorrectionBatchSchema>
export type GeneratedCorrection = z.infer<typeof generatedCorrectionSchema>
