import { z } from 'zod'
import { bulletinToneSchema } from '../../bulletin/schemas/bulletinSchema.ts'

// Contrairement au PAT, un bulletin a besoin de champs que l'app ne suit nulle
// part (matiere, note) : l'enseignant les fournit lui-meme dans son message.
// Chaque champ est nullable individuellement pour que l'IA d'extraction
// signale honnetement ce qui manque plutot que d'inventer une valeur.
export const bulletinExtractionSchema = z
  .object({
    studentQuery: z.string().trim().min(1).nullable(),
    subject: z.string().trim().min(1).nullable(),
    grade: z.string().trim().min(1).nullable(),
    observations: z.string().trim().min(1).nullable(),
    tone: bulletinToneSchema.nullable(),
  })
  .strict()

export type BulletinExtraction = z.infer<typeof bulletinExtractionSchema>

export interface ResolvedBulletinRequest {
  studentQuery: string
  subject: string
  grade: string
  observations?: string
  tone: z.infer<typeof bulletinToneSchema>
}

const DEFAULT_TONE: z.infer<typeof bulletinToneSchema> = 'bienveillant'

// Une extraction n'est exploitable que si les 3 champs indispensables a la
// generation (eleve, matiere, note) ont ete trouves ; le reste peut manquer.
export function resolveBulletinExtraction(
  extraction: BulletinExtraction
): ResolvedBulletinRequest | null {
  if (!extraction.studentQuery || !extraction.subject || !extraction.grade) return null

  return {
    studentQuery: extraction.studentQuery,
    subject: extraction.subject,
    grade: extraction.grade,
    observations: extraction.observations ?? undefined,
    tone: extraction.tone ?? DEFAULT_TONE,
  }
}
