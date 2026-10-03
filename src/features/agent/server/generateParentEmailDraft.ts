import { parentEmailMock } from '../mocks/parentEmailMock.ts'
import { parentEmailDraftSchema, type ParentEmailDraft, type ParentEmailRegister } from '../schemas/parentEmailSchema.ts'
import type { StudentObservationContext, StudentEvaluationResultContext } from '../types/memory.types.ts'
import { buildParentEmailPrompt } from './parentEmailPrompt.ts'
import type { ContentLanguage } from '@/features/i18n/locale'

export interface GenerateParentEmailDraftInput {
  studentFullName: string
  register: ParentEmailRegister
  situation?: string
  observations: StudentObservationContext[]
  evaluationResults: StudentEvaluationResultContext[]
  language?: ContentLanguage
}

export type ParentEmailGenerationMode = 'mock' | 'real'
export type StructuredParentEmailGenerator = (prompt: string) => Promise<unknown>

export function getParentEmailGenerationMode(): ParentEmailGenerationMode {
  const mode = process.env.PARENT_EMAIL_GENERATION_MODE ?? 'real'
  if (mode === 'mock' || mode === 'real') return mode
  throw new Error('INVALID_PARENT_EMAIL_GENERATION_MODE')
}

// N'inclut que les observations de comportement — jamais une observation
// hors-sujet (ex. progres academique) dans un courriel sur le comportement.
function buildGroundingLines(input: GenerateParentEmailDraftInput): string[] {
  if (input.register === 'comportement') {
    return input.observations
      .filter((observation) => observation.category === 'behavior')
      .map((observation) => `Observation du ${observation.createdAt.slice(0, 10)} — ${observation.tag}${observation.note ? ` : ${observation.note}` : ''}`)
  }
  if (input.register === 'echec') {
    return input.evaluationResults.map(
      (result) => `Résultat du ${result.createdAt.slice(0, 10)}${result.title ? ` (${result.title})` : ''} — ${result.grade}`
    )
  }
  return []
}

export async function generateRealParentEmailDraft(
  input: GenerateParentEmailDraftInput,
  generator: StructuredParentEmailGenerator
): Promise<ParentEmailDraft> {
  const groundingLines = buildGroundingLines(input)
  const prompt = buildParentEmailPrompt({
    studentFullName: input.studentFullName,
    register: input.register,
    situation: input.situation,
    groundingLines,
    language: input.language,
  })
  const output = await generator(prompt)
  return parentEmailDraftSchema.parse(output)
}

export async function generateParentEmailDraft(
  input: GenerateParentEmailDraftInput
): Promise<ParentEmailDraft> {
  const mode = getParentEmailGenerationMode()
  if (mode === 'mock') {
    return parentEmailDraftSchema.parse(structuredClone(parentEmailMock))
  }

  const { generateStructuredParentEmailWithAnthropic } = await import('./parentEmailModel.ts')
  return generateRealParentEmailDraft(input, generateStructuredParentEmailWithAnthropic)
}
