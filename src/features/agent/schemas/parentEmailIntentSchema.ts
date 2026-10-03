import { z } from 'zod'
import { parentEmailRegisterSchema, type ParentEmailRegister } from './parentEmailSchema.ts'

// Contrairement au PAT/plan de suivi (un seul champ : l'eleve), un courriel aux
// parents a besoin d'un motif (registre) et, pour les motifs sans donnee
// structuree en base (plagiat, autre), d'une situation decrite par
// l'enseignant lui-meme — jamais inventee par le modele.
export const parentEmailExtractionSchema = z
  .object({
    studentQuery: z.string().trim().min(1).nullable(),
    register: parentEmailRegisterSchema.nullable(),
    situation: z.string().trim().min(1).max(500).nullable(),
    // Adresse du parent si l'enseignant l'a deja donnee dans son message —
    // ne sert qu'a preremplir le champ destinataire de la carte, jamais a
    // envoyer automatiquement (l'enseignant confirme toujours explicitement).
    parentEmail: z.string().trim().min(1).max(254).nullable(),
  })
  .strict()

export type ParentEmailExtraction = z.infer<typeof parentEmailExtractionSchema>

export interface ResolvedParentEmailRequest {
  studentQuery: string
  register: ParentEmailRegister
  situation?: string
  suggestedRecipientEmail?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Une extraction n'est exploitable que si l'eleve et le motif sont identifies ;
// la situation reste facultative ici, elle est validee plus loin selon le
// motif (orchestration) car "comportement"/"echec" peuvent s'ancrer sur des
// donnees deja enregistrees, contrairement a "plagiat"/"autre". L'adresse
// parent, si fournie, est revalidee ici au format email — une valeur
// mal formee venant du modele est silencieusement ignoree plutot que de
// bloquer la generation du brouillon.
export function resolveParentEmailExtraction(
  extraction: ParentEmailExtraction
): ResolvedParentEmailRequest | null {
  if (!extraction.studentQuery || !extraction.register) return null

  const suggestedRecipientEmail =
    extraction.parentEmail && EMAIL_PATTERN.test(extraction.parentEmail)
      ? extraction.parentEmail
      : undefined

  return {
    studentQuery: extraction.studentQuery,
    register: extraction.register,
    situation: extraction.situation ?? undefined,
    suggestedRecipientEmail,
  }
}
