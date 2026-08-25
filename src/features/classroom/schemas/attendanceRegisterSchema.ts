import { z } from 'zod'

const dateSchema = z.iso.date('La date est invalide.')

export const attendanceRegisterRangeSchema = z
  .object({
    from: dateSchema,
    to: dateSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.from > value.to) {
      context.addIssue({ code: 'custom', path: ['to'], message: 'La date de fin doit suivre la date de début.' })
      return
    }
    const days = Math.floor(
      (new Date(`${value.to}T12:00:00Z`).getTime() - new Date(`${value.from}T12:00:00Z`).getTime()) /
        86_400_000
    )
    if (days > 550) {
      context.addIssue({ code: 'custom', path: ['to'], message: 'La période ne peut pas dépasser 18 mois.' })
    }
  })

export type AttendanceRegisterRange = z.infer<typeof attendanceRegisterRangeSchema>
