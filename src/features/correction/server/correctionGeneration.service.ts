import 'server-only'

import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { buildCorrectionPrompt } from '@/lib/prompts/correction'
import {
  generatedCorrectionSchema,
  type CorrectionTone,
  type GeneratedCorrection,
} from '@/features/correction/schemas/correctionSchema'
import type { ContentLanguage } from '@/features/profile/types/profile.types'

interface GenerateCorrectionInput {
  contentText: string
  tone: CorrectionTone
  teacherProfile: {
    level?: string | null
    language: ContentLanguage
  }
}

class CorrectionValidationError extends Error {
  constructor(readonly details: string) {
    super('INVALID_CORRECTION_STRUCTURE')
  }
}

export function stripJsonCodeFence(value: string) {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) return trimmed

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

export function parseGeneratedCorrectionJson(value: string): GeneratedCorrection {
  const json = stripJsonCodeFence(value)
  let parsed: unknown

  try {
    parsed = JSON.parse(json)
  } catch (error) {
    console.error('[correction:generation] JSON IA invalide', error)
    throw new CorrectionValidationError('La réponse n’est pas un JSON valide.')
  }

  const result = generatedCorrectionSchema.safeParse(parsed)
  if (!result.success) {
    const details = JSON.stringify(result.error.flatten())
    console.error('[correction:generation] structure IA invalide', result.error.flatten())
    throw new CorrectionValidationError(details)
  }

  return result.data
}

function buildMockCorrection(input: GenerateCorrectionInput) {
  const findings = [
    { category: 'syntaxe' as const, excerpt: 'il ont regardé', suggestion: 'accord sujet-verbe : "ils ont regardé"' },
    { category: 'methode' as const, excerpt: 'paragraphe 2', suggestion: 'ajouter une phrase de transition avant l’argument suivant' },
  ]

  const comment =
    input.tone === 'factuel'
      ? 'La copie montre une structure claire en trois parties. Deux points sont à travailler : l’accord sujet-verbe et la transition entre les paragraphes. Le vocabulaire employé est globalement adapté au sujet.'
      : input.tone === 'direct'
        ? 'Structure claire, bon point de départ. À corriger en priorité : l’accord sujet-verbe et la transition entre les paragraphes. Retravaille ces deux points pour la prochaine copie.'
        : 'Bon travail sur la structure en trois parties ! Le prochain axe de progression consiste à consolider l’accord sujet-verbe et à mieux relier les paragraphes entre eux. Continue sur cette lancée.'

  return JSON.stringify({ findings, comment })
}

async function callAnthropic({
  contentText,
  tone,
  teacherProfile,
  validationError,
}: GenerateCorrectionInput & { validationError?: string }) {
  const { systemPrompt, userPrompt } = buildCorrectionPrompt({
    contentText,
    tone,
    teacherProfile,
    validationError,
  })

  const result = await generateText({
    model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.3,
    maxOutputTokens: 1200,
    maxRetries: 1,
    timeout: 45000,
  })

  return result.text
}

export async function generateCorrectionForCopy(
  input: GenerateCorrectionInput
): Promise<GeneratedCorrection> {
  if (process.env.CORRECTION_GENERATION_MODE === 'fail') {
    console.error('[correction:generation] echec simule par CORRECTION_GENERATION_MODE')
    throw new Error('SIMULATED_CORRECTION_GENERATION_FAILED')
  }

  if (process.env.CORRECTION_GENERATION_MODE === 'mock') {
    return parseGeneratedCorrectionJson(buildMockCorrection(input))
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[correction:generation] ANTHROPIC_API_KEY manquante')
    throw new Error('MISSING_ANTHROPIC_API_KEY')
  }

  try {
    const firstResponse = await callAnthropic(input)
    return parseGeneratedCorrectionJson(firstResponse)
  } catch (error) {
    if (!(error instanceof CorrectionValidationError)) {
      console.error('[correction:generation] appel Anthropic echoue', error)
      throw new Error('CORRECTION_GENERATION_FAILED')
    }

    try {
      const retryResponse = await callAnthropic({ ...input, validationError: error.details })
      return parseGeneratedCorrectionJson(retryResponse)
    } catch (retryError) {
      console.error('[correction:generation] validation finale echouee', retryError)
      throw new Error('INVALID_CORRECTION_GENERATION')
    }
  }
}
