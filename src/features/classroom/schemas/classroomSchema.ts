import { z } from 'zod'

export const classSchema = z.object({
  name: z.string().trim().min(2, 'Le nom de la classe est requis'),
  level: z.string().trim().min(1, 'Le niveau est requis'),
  subject: z.string().trim().min(1, 'La matiere est requise'),
})

export const studentSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prenom est requis'),
  lastName: z.string().trim().min(1, 'Le nom est requis'),
  language: z.string().trim().min(1, 'La langue est requise'),
  needs: z.string().trim().optional(),
})

export const observationSchema = z.object({
  category: z.enum(['behavior', 'effort', 'attention', 'homework', 'progress', 'other']),
  tag: z.string().trim().min(1, 'Choisissez une observation'),
  note: z.string().trim().max(500, 'La note est trop longue').optional(),
})

export type ClassInput = z.infer<typeof classSchema>
export type StudentInput = z.infer<typeof studentSchema>
export type ObservationInput = z.infer<typeof observationSchema>
