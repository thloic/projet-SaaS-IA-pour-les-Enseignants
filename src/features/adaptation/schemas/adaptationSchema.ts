import { z } from 'zod'

export const variantTypeSchema = z.enum([
  'standard',
  'support',
  'dys',
  'adhd',
  'enrichment',
])

export const adaptationSourceTypeSchema = z.enum([
  'course',
  'document',
  'paste',
  'upload',
])

export const generatedVariantSchema = z.object({
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().min(20).max(800),
  learningObjectives: z.array(z.string().trim().min(3).max(300)).min(1).max(8),
  sections: z
    .array(
      z.object({
        heading: z.string().trim().min(2).max(160),
        content: z.string().trim().min(10).max(5000),
        instructions: z.array(z.string().trim().min(2).max(500)).max(10).default([]),
      })
    )
    .min(1)
    .max(12),
  exercises: z
    .array(
      z.object({
        instruction: z.string().trim().min(5).max(1000),
        supportHint: z.string().trim().max(500).nullable().default(null),
      })
    )
    .max(12)
    .default([]),
  accommodations: z.array(z.string().trim().min(3).max(500)).min(1).max(12),
  teacherNotes: z.array(z.string().trim().min(3).max(500)).max(10).default([]),
  visualSupports: z.array(z.string().trim().min(3).max(300)).max(10).default([]),
})

export const adaptationGenerationInputSchema = z
  .object({
    sourceType: adaptationSourceTypeSchema,
    sourceId: z.string().uuid().optional(),
    title: z.string().trim().min(2, 'Donnez un titre à la leçon.').max(160),
    pastedText: z.string().trim().max(30000).optional(),
    subject: z.string().trim().min(1, 'Indiquez la matière.').max(100),
    level: z.string().trim().min(1, 'Indiquez le niveau.').max(100),
    studentIds: z.array(z.string().uuid()).max(50).default([]),
    forceNew: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (
      (value.sourceType === 'course' || value.sourceType === 'document') &&
      !value.sourceId
    ) {
      context.addIssue({
        code: 'custom',
        path: ['sourceId'],
        message: 'Choisissez un cours ou un document.',
      })
    }

    if (
      (value.sourceType === 'paste' || value.sourceType === 'upload') &&
      (!value.pastedText || value.pastedText.length < 20)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['pastedText'],
        message: 'Ajoutez un contenu de cours suffisamment détaillé.',
      })
    }
  })

export const updateVariantSchema = z.object({
  variantId: z.string().uuid(),
  contentMd: z.string().trim().min(20, 'Le contenu de la variante est trop court.').max(50000),
})

export const shareAdaptationSchema = z.object({
  adaptationSetId: z.string().uuid(),
  variantType: variantTypeSchema.nullable().default(null),
  expiresInDays: z.number().int().min(1).max(90).nullable().default(30),
})

export type VariantType = z.infer<typeof variantTypeSchema>
export type AdaptationSourceType = z.infer<typeof adaptationSourceTypeSchema>
export type GeneratedVariant = z.infer<typeof generatedVariantSchema>
export type AdaptationGenerationInput = z.infer<typeof adaptationGenerationInputSchema>
