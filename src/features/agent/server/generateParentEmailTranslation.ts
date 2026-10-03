import { parentEmailTranslationMock } from '../mocks/parentEmailTranslationMock.ts'
import { parentEmailDraftSchema, type ParentEmailDraft } from '../schemas/parentEmailSchema.ts'
import { buildParentEmailTranslationPrompt } from './parentEmailTranslationPrompt.ts'

export interface TranslateParentEmailDraftInput {
  subject: string
  body: string
  targetLanguage: string
}

export type ParentEmailTranslationMode = 'mock' | 'real'
export type StructuredParentEmailTranslator = (prompt: string) => Promise<unknown>

export function getParentEmailTranslationMode(): ParentEmailTranslationMode {
  const mode = process.env.PARENT_EMAIL_TRANSLATION_MODE ?? 'real'
  if (mode === 'mock' || mode === 'real') return mode
  throw new Error('INVALID_PARENT_EMAIL_TRANSLATION_MODE')
}

export async function translateRealParentEmailDraft(
  input: TranslateParentEmailDraftInput,
  translator: StructuredParentEmailTranslator
): Promise<ParentEmailDraft> {
  const prompt = buildParentEmailTranslationPrompt(input)
  const output = await translator(prompt)
  return parentEmailDraftSchema.parse(output)
}

export async function translateParentEmailDraft(
  input: TranslateParentEmailDraftInput
): Promise<ParentEmailDraft> {
  const mode = getParentEmailTranslationMode()
  if (mode === 'mock') {
    return parentEmailDraftSchema.parse(structuredClone(parentEmailTranslationMock))
  }

  const { translateStructuredParentEmailWithAnthropic } = await import('./parentEmailTranslationModel.ts')
  return translateRealParentEmailDraft(input, translateStructuredParentEmailWithAnthropic)
}
