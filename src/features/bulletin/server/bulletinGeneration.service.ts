import 'server-only'

import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { buildBulletinPrompt } from '@/lib/prompts/bulletin'
import { generatedBulletinSchema, type BulletinGenerationInput, type GeneratedBulletin } from '@/features/bulletin/schemas/bulletinSchema'
import type { ContentLanguage, GradingSystem } from '@/features/profile/types/profile.types'

interface GenerateBulletinCommentInput {
  input: BulletinGenerationInput
  teacherProfile: {
    subject?: string | null
    subjects?: string[] | null
    gradingSystem: GradingSystem
    language: ContentLanguage
  }
}

class BulletinValidationError extends Error {
  constructor(readonly details: string) {
    super('INVALID_BULLETIN_STRUCTURE')
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

export function parseGeneratedBulletinJson(value: string): GeneratedBulletin {
  const json = stripJsonCodeFence(value)
  let parsed: unknown

  try {
    parsed = JSON.parse(json)
  } catch (error) {
    console.error('[bulletin:generation] JSON IA invalide', error)
    throw new BulletinValidationError('La réponse n’est pas un JSON valide.')
  }

  const result = generatedBulletinSchema.safeParse(parsed)
  if (!result.success) {
    const details = JSON.stringify(result.error.flatten())
    console.error('[bulletin:generation] structure IA invalide', result.error.flatten())
    throw new BulletinValidationError(details)
  }

  return result.data
}

function buildMockBulletin(input: GenerateBulletinCommentInput) {
  const comment =
    input.input.tone === 'factuel'
      ? `${input.input.student_name} présente des acquis visibles en ${input.input.subject}, avec une évaluation située à ${input.input.grade}. Les éléments observés montrent un travail régulier et des repères en construction. Son prochain axe de progression consiste à consolider ses méthodes afin de gagner en précision et en autonomie.`
      : input.input.tone === 'encourageant'
        ? `${input.input.student_name} progresse avec sérieux en ${input.input.subject} et peut s’appuyer sur les réussites déjà observées. La note ${input.input.grade} montre une base de travail encourageante. En poursuivant ses efforts et en consolidant ses méthodes, il ou elle pourra franchir une nouvelle étape avec confiance.`
        : `${input.input.student_name} montre une attitude positive en ${input.input.subject} et s’engage avec application dans les apprentissages. La note ${input.input.grade} met en lumière des acquis sur lesquels continuer à construire. Son prochain axe de progression sera de consolider les notions travaillées avec régularité et confiance.`

  return JSON.stringify({ comment })
}

async function callAnthropic({
  input,
  teacherProfile,
  validationError,
}: GenerateBulletinCommentInput & { validationError?: string }) {
  const { systemPrompt, userPrompt } = buildBulletinPrompt({
    input,
    teacherProfile,
    validationError,
  })

  const result = await generateText({
    model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.25,
    maxOutputTokens: 900,
    maxRetries: 1,
    timeout: 45000,
  })

  return result.text
}

export async function generateBulletinComment(input: GenerateBulletinCommentInput): Promise<GeneratedBulletin> {
  if (process.env.BULLETIN_GENERATION_MODE === 'fail') {
    console.error('[bulletin:generation] echec simule par BULLETIN_GENERATION_MODE')
    throw new Error('SIMULATED_BULLETIN_GENERATION_FAILED')
  }

  if (process.env.BULLETIN_GENERATION_MODE === 'mock') {
    return parseGeneratedBulletinJson(buildMockBulletin(input))
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[bulletin:generation] ANTHROPIC_API_KEY manquante')
    throw new Error('MISSING_ANTHROPIC_API_KEY')
  }

  try {
    const firstResponse = await callAnthropic(input)
    return parseGeneratedBulletinJson(firstResponse)
  } catch (error) {
    if (!(error instanceof BulletinValidationError)) {
      console.error('[bulletin:generation] appel Anthropic echoue', error)
      throw new Error('BULLETIN_GENERATION_FAILED')
    }

    try {
      const retryResponse = await callAnthropic({
        ...input,
        validationError: error.details,
      })
      return parseGeneratedBulletinJson(retryResponse)
    } catch (retryError) {
      console.error('[bulletin:generation] validation finale echouee', retryError)
      throw new Error('INVALID_BULLETIN_GENERATION')
    }
  }
}
