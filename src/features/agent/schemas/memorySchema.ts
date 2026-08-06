import { z } from 'zod'

export const getStudentContextInputSchema = z
  .object({
    studentQuery: z.string().trim().min(1, 'Le nom de l’élève est requis.').max(200),
  })
  .strict()

export const saveStudentObservationInputSchema = z
  .object({
    studentId: z.string().uuid('L’identifiant de l’élève est invalide.'),
    contenu: z.string().trim().min(1, 'Le contenu de l’observation est requis.').max(4000),
  })
  .strict()

export type GetStudentContextInput = z.infer<typeof getStudentContextInputSchema>
export type SaveStudentObservationInput = z.infer<typeof saveStudentObservationInputSchema>
