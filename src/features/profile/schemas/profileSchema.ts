import { z } from 'zod'

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prenom est requis'),
  lastName: z.string().trim().min(1, 'Le nom est requis'),
  country: z.string().trim().min(1, 'Le pays est requis'),
  subject: z.string().trim().min(1, 'La matiere est requise'),
  levels: z.array(z.string().trim().min(1)).min(1, 'Selectionnez au moins un niveau'),
  gradingSystem: z.enum(['20', '10', 'letter']),
  language: z.enum(['fr', 'en']),
  styleNotes: z.string().trim().max(1000, 'Les notes de style sont trop longues').optional(),
})

export type ProfileInput = z.infer<typeof profileSchema>
