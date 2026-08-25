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

// Forme finale, celle que l'enseignant copie dans le bulletin officiel — un
// seul bloc de texte, inchangee pour ne pas casser l'historique/l'affichage
// existants.
export const generatedBulletinSchema = z.object({
  comment: z.string().trim().min(50, 'Le commentaire généré est trop court.'),
})

// Forme demandee a l'IA : structure imposee par le client (deux points forts
// distincts + une prochaine etape, jamais un point faible formule
// negativement). Assemblee en un seul texte par bulletinValidation.ts avant
// de prendre la forme ci-dessus.
export const bulletinDraftSchema = z.object({
  strengths: z
    .array(z.string().trim().min(1))
    .length(2, 'Il faut exactement deux points forts.'),
  nextStep: z.string().trim().min(1, 'La prochaine étape est requise.'),
})

export type BulletinTone = z.infer<typeof bulletinToneSchema>
export type BulletinInput = z.infer<typeof bulletinInputSchema>
export type BulletinGenerationInput = z.infer<typeof bulletinGenerationInputSchema>
export type GeneratedBulletin = z.infer<typeof generatedBulletinSchema>
export type BulletinDraft = z.infer<typeof bulletinDraftSchema>
