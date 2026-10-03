import { z } from 'zod'

export const parentEmailRegisterSchema = z.enum(['comportement', 'echec', 'plagiat', 'autre'])

// Sortie demandee au modele : un sujet court + un corps de courriel complet.
// Toujours un brouillon a relire — jamais envoye automatiquement (CLAUDE.md §2.2 et §9).
export const parentEmailDraftSchema = z.object({
  subject: z.string().trim().min(1).max(150),
  body: z.string().trim().min(80),
})

export type ParentEmailRegister = z.infer<typeof parentEmailRegisterSchema>
export type ParentEmailDraft = z.infer<typeof parentEmailDraftSchema>

// Entree de l'action de traduction (bouton sur la carte, jamais une intention
// de chat) : le texte source est celui affiche a l'ecran au moment du clic,
// retouches de l'enseignant compris — jamais relu depuis la base.
export const parentEmailTranslationInputSchema = z.object({
  subject: z.string().trim().min(1).max(150),
  body: z.string().trim().min(1),
  targetLanguage: z.string().trim().min(1).max(60),
})

export type ParentEmailTranslationInput = z.infer<typeof parentEmailTranslationInputSchema>
