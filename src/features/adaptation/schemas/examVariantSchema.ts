import { z } from 'zod'

export const examVariantLabelSchema = z.enum(['A', 'B', 'C'])

export const examVariantQuestionSchema = z.object({
  prompt: z.string().trim().min(5).max(1000),
  points: z.number().int().min(1).max(100),
})

export const examVariantSchema = z.object({
  label: examVariantLabelSchema,
  title: z.string().trim().min(3).max(160),
  questions: z.array(examVariantQuestionSchema).min(1).max(50),
})

export const examVariantSetSchema = z.object({
  variants: z.array(examVariantSchema).length(3),
})

export const examVariantGenerationInputSchema = z.object({
  sourceContent: z.string().trim().min(20, 'Ajoutez le contenu de l’examen original.').max(30000),
  sourceTitle: z.string().trim().min(3, 'Ajoutez le titre de l’examen.').max(160),
  subject: z.string().trim().min(1, 'Indiquez la matière.').max(100),
  level: z.string().trim().min(1, 'Indiquez le niveau.').max(100),
})

export type ExamVariantLabel = z.infer<typeof examVariantLabelSchema>
export type ExamVariantQuestion = z.infer<typeof examVariantQuestionSchema>
export type ExamVariant = z.infer<typeof examVariantSchema>
export type ExamVariantSet = z.infer<typeof examVariantSetSchema>
export type ExamVariantGenerationInput = z.infer<typeof examVariantGenerationInputSchema>

export type ExamVariantConsistencyCode =
  | 'DUPLICATE_LABEL'
  | 'QUESTION_COUNT_MISMATCH'
  | 'POINTS_MISMATCH'
  | 'DUPLICATE_QUESTION'

export class ExamVariantConsistencyError extends Error {
  readonly code: ExamVariantConsistencyCode

  constructor(code: ExamVariantConsistencyCode, detail: string) {
    super(detail)
    this.name = 'ExamVariantConsistencyError'
    this.code = code
  }
}

// Garde-fou d'integrite du mode « variantes A/B/C » (fiche 5 du plan technique) :
// les 3 versions doivent rester interchangeables pour l'enseignant (meme nombre
// de questions, meme bareme question par question) sans jamais reprendre une
// question a l'identique d'une version a l'autre (perdrait l'interet meme d'avoir
// plusieurs versions face a la copie entre eleves).
export function assertExamVariantConsistency(set: ExamVariantSet): void {
  const labels = new Set(set.variants.map((variant) => variant.label))
  if (labels.size !== set.variants.length) {
    throw new ExamVariantConsistencyError(
      'DUPLICATE_LABEL',
      'Deux variantes partagent la même étiquette.'
    )
  }

  const [reference, ...others] = set.variants
  if (!reference) return

  for (const variant of others) {
    if (variant.questions.length !== reference.questions.length) {
      throw new ExamVariantConsistencyError(
        'QUESTION_COUNT_MISMATCH',
        `La variante ${variant.label} n’a pas le même nombre de questions que la variante ${reference.label}.`
      )
    }
    for (let index = 0; index < reference.questions.length; index += 1) {
      if (variant.questions[index]!.points !== reference.questions[index]!.points) {
        throw new ExamVariantConsistencyError(
          'POINTS_MISMATCH',
          `La question ${index + 1} de la variante ${variant.label} n’a pas le même barème que la variante ${reference.label}.`
        )
      }
    }
  }

  const seenPrompts = new Map<string, ExamVariantLabel>()
  for (const variant of set.variants) {
    for (const question of variant.questions) {
      const normalized = question.prompt.trim().toLocaleLowerCase('fr')
      const existingLabel = seenPrompts.get(normalized)
      if (existingLabel) {
        throw new ExamVariantConsistencyError(
          'DUPLICATE_QUESTION',
          `La question « ${question.prompt} » apparaît identique dans les variantes ${existingLabel} et ${variant.label}.`
        )
      }
      seenPrompts.set(normalized, variant.label)
    }
  }
}
