import { z } from 'zod'
import { profileSchema } from '@/features/profile/schemas/profileSchema'

// Sous-ensemble des champs modifiables depuis la page Paramètres
// (pas de "levels" ni "styleNotes" affichés sur ce formulaire).
export const settingsProfileSchema = profileSchema.pick({
  firstName: true,
  lastName: true,
  country: true,
  subject: true,
  gradingSystem: true,
  language: true,
})

export const settingsEmailSchema = z.object({
  email: z.email('Email invalide'),
})

export type SettingsProfileInput = z.infer<typeof settingsProfileSchema>
