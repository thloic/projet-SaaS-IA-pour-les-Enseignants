import { z } from 'zod'
import { variantTypeSchema } from '@/features/adaptation/schemas/adaptationSchema'
import { classroomPeriodSchema } from '@/features/classroom/schemas/classroomDashboardSchema'
import { attendanceRegisterRangeSchema } from '@/features/classroom/schemas/attendanceRegisterSchema'

export const exportRequestSchema = z
  .object({
    source: z.enum(['course', 'adaptation_variant', 'classroom', 'attendance_register']),
    sourceId: z.string().uuid(),
    variantType: variantTypeSchema.optional(),
    format: z.enum(['pdf', 'docx']),
    period: classroomPeriodSchema.optional(),
    includeNames: z.boolean().optional(),
    includeObservations: z.boolean().optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .superRefine((value, context) => {
    if (value.source === 'adaptation_variant' && !value.variantType) {
      context.addIssue({
        code: 'custom',
        path: ['variantType'],
        message: 'Précisez la variante à exporter.',
      })
    }
    if (value.source === 'attendance_register' && (!value.from || !value.to)) {
      context.addIssue({
        code: 'custom',
        path: ['from'],
        message: 'Précisez la période du registre.',
      })
    }
    if (value.source === 'attendance_register' && value.from && value.to) {
      const range = attendanceRegisterRangeSchema.safeParse({ from: value.from, to: value.to })
      if (!range.success) {
        context.addIssue({
          code: 'custom',
          path: ['to'],
          message: range.error.issues[0]?.message ?? 'La période du registre est invalide.',
        })
      }
    }
  })

export type ExportRequestInput = z.infer<typeof exportRequestSchema>
