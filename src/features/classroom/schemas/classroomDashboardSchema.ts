import { z } from 'zod'

export const classroomPeriodSchema = z.enum(['7d', '30d', '90d'], {
  error: 'Choisissez une période de 7, 30 ou 90 jours.',
})
