import { z } from 'zod'

export const bulletinToneSchema = z.enum(['bienveillant', 'encourageant', 'factuel'])

export const bulletinInputSchema = z.object({
  student_name: z.string().trim().min(1, 'Indiquez le prénom de l’élève.'),
  subject: z.string().trim().min(1, 'Choisissez une matière.'),
  grade: z.string().trim().min(1, 'Indiquez la note ou l’appréciation.'),
  observations: z.string().trim().max(500, 'Les observations sont limitées à 500 caractères.').optional(),
  tone: bulletinToneSchema,
})

export const generatedBulletinSchema = z.object({
  comment: z.string().trim().min(50, 'Le commentaire généré est trop court.'),
})

export type BulletinTone = z.infer<typeof bulletinToneSchema>
export type BulletinInput = z.infer<typeof bulletinInputSchema>
export type GeneratedBulletin = z.infer<typeof generatedBulletinSchema>
