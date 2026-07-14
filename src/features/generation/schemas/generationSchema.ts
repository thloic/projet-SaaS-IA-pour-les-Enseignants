import { z } from 'zod'

export const courseDurationSchema = z.union([
  z.literal(30),
  z.literal(45),
  z.literal(60),
  z.literal(90),
  z.literal(120),
])

export const courseInputSchema = z.object({
  subject: z.string().trim().min(1, 'Choisissez une matière.'),
  level: z.string().trim().min(1, 'Choisissez un niveau.'),
  topic: z.string().trim().min(1, 'Indiquez le thème du cours.').max(200, 'Le thème est trop long.'),
  duration_minutes: z.coerce.number().pipe(courseDurationSchema),
  objectives: z.string().trim().max(500, 'Les objectifs sont limités à 500 caractères.').optional(),
  activities: z.array(z.string().trim().min(1)).max(8, 'Trop de types d’activités sélectionnés.').optional(),
})

export type CourseInput = z.infer<typeof courseInputSchema>
export type CourseDuration = z.infer<typeof courseDurationSchema>
