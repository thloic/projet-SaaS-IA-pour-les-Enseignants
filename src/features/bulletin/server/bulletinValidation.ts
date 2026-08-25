import {
  bulletinDraftSchema,
  generatedBulletinSchema,
  type GeneratedBulletin,
} from '../schemas/bulletinSchema.ts'
import { containsNegativeLanguage } from '../../../lib/validation/negativeLanguage.ts'

export class BulletinValidationError extends Error {
  readonly details: string

  constructor(details: string) {
    super('INVALID_BULLETIN_STRUCTURE')
    this.details = details
  }
}

export function stripJsonCodeFence(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) return trimmed

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

// Assemble les deux points forts et la prochaine etape en un seul bloc de
// texte, pret a etre copie tel quel par l'enseignant dans le bulletin
// officiel — l'IA ne voit jamais cette etape, elle ne fournit que les champs
// structures.
function assembleComment(draft: { strengths: [string, string] | string[]; nextStep: string }): string {
  return [...draft.strengths, draft.nextStep].join(' ')
}

export function parseAndValidateBulletinDraft(value: string): GeneratedBulletin {
  const json = stripJsonCodeFence(value)
  let parsed: unknown

  try {
    parsed = JSON.parse(json)
  } catch {
    throw new BulletinValidationError('La réponse n’est pas un JSON valide.')
  }

  const result = bulletinDraftSchema.safeParse(parsed)
  if (!result.success) {
    throw new BulletinValidationError(JSON.stringify(result.error.flatten()))
  }

  if (containsNegativeLanguage([...result.data.strengths, result.data.nextStep])) {
    throw new BulletinValidationError(
      'Une formulation négative directe a été détectée — reformule en axe de progrès.'
    )
  }

  return generatedBulletinSchema.parse({ comment: assembleComment(result.data) })
}
