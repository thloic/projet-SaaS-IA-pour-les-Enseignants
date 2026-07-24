import { z } from 'zod'
import { variantTypeSchema } from '@/features/adaptation/schemas/adaptationSchema'

export const exportRequestSchema = z
  .object({
    source: z.enum(['course', 'adaptation_variant']),
    sourceId: z.string().uuid(),
    variantType: variantTypeSchema.optional(),
    format: z.enum(['pdf', 'docx']),
  })
  .superRefine((value, context) => {
    if (value.source === 'adaptation_variant' && !value.variantType) {
      context.addIssue({
        code: 'custom',
        path: ['variantType'],
        message: 'Précisez la variante à exporter.',
      })
    }
  })

export type ExportRequestInput = z.infer<typeof exportRequestSchema>
