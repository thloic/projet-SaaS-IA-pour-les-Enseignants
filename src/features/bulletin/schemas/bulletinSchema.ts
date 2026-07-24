import { z } from 'zod'

export const bulletinToneSchema = z.enum(['bienveillant', 'encourageant', 'factuel'])

// Entree du formulaire : l'eleve est choisi via classe -> eleve (selects en
// cascade), plus de saisie libre du nom.
export const bulletinInputSchema = z.object({
  class_id: z.string().uuid('Sélectionnez une classe.'),
  student_id: z.string().uuid('Sélectionnez un élève.'),
  subject: z.string().trim().min(1, 'Choisissez une matière.'),
  grade: z.string().trim().min(1, 'Indiquez la note ou l’appréciation.'),
  observations: z.string().trim().max(500, 'Les observations sont limitées à 500 caractères.').optional(),
  tone: bulletinToneSchema,
})

// Entree consommee par le prompt/le service de generation, une fois le nom
// de l'eleve resolu cote serveur a partir de class_id/student_id.
export const bulletinGenerationInputSchema = bulletinInputSchema
  .omit({ class_id: true, student_id: true })
  .extend({
    student_name: z.string().trim().min(1, 'Indiquez le prénom de l’élève.'),
  })

export const generatedBulletinSchema = z.object({
  comment: z.string().trim().min(50, 'Le commentaire généré est trop court.'),
})

export type BulletinTone = z.infer<typeof bulletinToneSchema>
export type BulletinInput = z.infer<typeof bulletinInputSchema>
export type BulletinGenerationInput = z.infer<typeof bulletinGenerationInputSchema>
export type GeneratedBulletin = z.infer<typeof generatedBulletinSchema>
