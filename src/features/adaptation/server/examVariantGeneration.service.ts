import {
  assertExamVariantConsistency,
  examVariantSetSchema,
  type ExamVariantSet,
} from '../schemas/examVariantSchema.ts'
import { buildExamVariantPrompt } from '../../../lib/prompts/examVariant.ts'
import type { ContentLanguage } from '@/features/profile/types/profile.types'

interface GenerateExamVariantSetInput {
  sourceContent: string
  sourceTitle: string
  subject: string
  level: string
  language: ContentLanguage
  signal?: AbortSignal
}

function stripJsonCodeFence(value: string) {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) return trimmed

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

// Exportee pour etre testee directement, sans appel reseau : valide a la fois la
// structure Zod et la coherence entre variantes (voir examVariantSchema.ts).
export function parseExamVariantSet(value: string): ExamVariantSet {
  const json = stripJsonCodeFence(value)
  let candidate: unknown
  try {
    candidate = JSON.parse(json)
  } catch (error) {
    console.error('[adaptation:exam-variant] JSON IA invalide', error)
    throw new Error('JSON invalide')
  }

  const parsed = examVariantSetSchema.parse(candidate)
  assertExamVariantConsistency(parsed)
  return parsed
}

function buildMockExamVariantSet(input: GenerateExamVariantSetInput): ExamVariantSet {
  const scenarios = [
    { label: 'A' as const, numbers: [12, 8] },
    { label: 'B' as const, numbers: [15, 9] },
    { label: 'C' as const, numbers: [20, 7] },
  ]

  return examVariantSetSchema.parse({
    variants: scenarios.map(({ label, numbers }) => ({
      label,
      title: `${input.sourceTitle} — Version ${label}`,
      questions: [
        { prompt: `Calcule ${numbers[0]} + ${numbers[1]} et explique ta démarche.`, points: 5 },
        { prompt: `Justifie le résultat obtenu à la question précédente (version ${label}).`, points: 10 },
      ],
    })),
  })
}

// L'appel reseau reel n'est importe qu'ici, jamais au chargement du module : en
// mode mock (tests, developpement), examVariantModel.ts — qui porte `server-only`
// — n'est jamais resolu, comme pour generatePAT.ts/patModel.ts.
async function requestExamVariantSet(
  input: GenerateExamVariantSetInput,
  validationError?: string
): Promise<ExamVariantSet> {
  const { systemPrompt, userPrompt } = buildExamVariantPrompt({ ...input, validationError })
  const { generateExamVariantTextWithAnthropic } = await import('./examVariantModel.ts')
  const text = await generateExamVariantTextWithAnthropic(systemPrompt, userPrompt, input.signal)
  return parseExamVariantSet(text)
}

export async function generateExamVariantSet(
  input: GenerateExamVariantSetInput
): Promise<ExamVariantSet> {
  const mode = process.env.EXAM_VARIANT_GENERATION_MODE

  if (mode === 'fail') {
    throw new Error('EXAM_VARIANT_GENERATION_FAILED_FOR_TEST')
  }

  if (mode === 'mock') {
    return buildMockExamVariantSet(input)
  }

  try {
    return await requestExamVariantSet(input)
  } catch (firstError) {
    const message = firstError instanceof Error ? firstError.message : 'Réponse invalide'
    console.error('[adaptation:exam-variant] première tentative échouée', firstError)

    try {
      return await requestExamVariantSet(input, message)
    } catch (retryError) {
      console.error('[adaptation:exam-variant] seconde tentative échouée', retryError)
      throw new Error('EXAM_VARIANT_GENERATION_FAILED')
    }
  }
}
