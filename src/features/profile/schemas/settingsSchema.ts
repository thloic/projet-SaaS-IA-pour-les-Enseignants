import { z } from 'zod'
import { profileSchema } from '@/features/profile/schemas/profileSchema'

// Sous-ensemble des champs modifiables depuis la page Paramètres
// (pas de "levels" ni "styleNotes" affichés sur ce formulaire).
export const settingsProfileSchema = profileSchema.pick({
  firstName: true,
  lastName: true,
  country: true,
  subjects: true,
  language: true,
}).extend({
  gradingSystem: z.enum(['20', '10', 'letter', 'percentage', 'letter_ca', 'levels']),
})

export const settingsEmailSchema = z.object({
  email: z.email('Email invalide'),
})

export type SettingsProfileInput = z.infer<typeof settingsProfileSchema>
