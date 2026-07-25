import { z } from 'zod'

export const dashboardPresetSchema = z.enum(['7d', '30d', '90d', 'custom'], {
  error: 'Choisissez une période valide.',
})

export const dashboardPeriodQuerySchema = z.object({
  preset: dashboardPresetSchema.optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
})

export type DashboardPreset = z.infer<typeof dashboardPresetSchema>

