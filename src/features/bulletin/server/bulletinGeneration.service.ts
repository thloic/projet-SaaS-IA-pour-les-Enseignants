import 'server-only'

import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { buildBulletinPrompt } from '@/lib/prompts/bulletin'
import { generatedBulletinSchema, type BulletinGenerationInput, type GeneratedBulletin } from '@/features/bulletin/schemas/bulletinSchema'
import { BulletinValidationError, parseAndValidateBulletinDraft } from '@/features/bulletin/server/bulletinValidation'
import type { ContentLanguage, GradingSystem } from '@/features/profile/types/profile.types'
import type { ResolvedDocumentTemplate } from '@/features/agent/types/documentTemplate.types'
import type { StudentEvaluationResultContext, StudentObservationContext } from '@/features/agent/types/memory.types'

interface GenerateBulletinCommentInput {
  input: BulletinGenerationInput
  teacherProfile: {
    subject?: string | null
    subjects?: string[] | null
    gradingSystem: GradingSystem
    language: ContentLanguage
  }
  documentTemplate?: ResolvedDocumentTemplate
  evaluationResults?: StudentEvaluationResultContext[]
  studentObservations?: StudentObservationContext[]
  previousComment?: string
  modificationInstruction?: string
}

function buildMockBulletin(input: GenerateBulletinCommentInput): GeneratedBulletin {
  const comment =
    input.input.tone === 'factuel'
      ? `${input.input.student_name} présente des acquis visibles en ${input.input.subject}, avec une évaluation située à ${input.input.grade}. Les éléments observés montrent un travail régulier et des repères en construction. Son prochain axe de progression consiste à consolider ses méthodes afin de gagner en précision et en autonomie.`
      : input.input.tone === 'encourageant'
        ? `${input.input.student_name} progresse avec sérieux en ${input.input.subject} et peut s’appuyer sur les réussites déjà observées. La note ${input.input.grade} montre une base de travail encourageante. En poursuivant ses efforts et en consolidant ses méthodes, il ou elle pourra franchir une nouvelle étape avec confiance.`
        : `${input.input.student_name} montre une attitude positive en ${input.input.subject} et s’engage avec application dans les apprentissages. La note ${input.input.grade} met en lumière des acquis sur lesquels continuer à construire. Son prochain axe de progression sera de consolider les notions travaillées avec régularité et confiance.`

  return generatedBulletinSchema.parse({ comment })
}

async function callAnthropic({
  input,
  teacherProfile,
  documentTemplate,
  evaluationResults,
  studentObservations,
  previousComment,
  modificationInstruction,
  validationError,
}: GenerateBulletinCommentInput & { validationError?: string }) {
  const { systemPrompt, userPrompt } = buildBulletinPrompt({
    input,
    teacherProfile,
    validationError,
    documentTemplate,
    evaluationResults,
    studentObservations,
    previousComment,
    modificationInstruction,
  })

  const result = await generateText({
    model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
    system: systemPrompt,
    prompt:
      documentTemplate?.kind === 'pdf'
        ? [
            {
              role: 'user' as const,
              content: [
                { type: 'text' as const, text: userPrompt },
                { type: 'file' as const, data: documentTemplate.base64, mediaType: 'application/pdf' },
              ],
            },
          ]
        : userPrompt,
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
    return buildMockBulletin(input)
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[bulletin:generation] ANTHROPIC_API_KEY manquante')
    throw new Error('MISSING_ANTHROPIC_API_KEY')
  }

  try {
    const firstResponse = await callAnthropic(input)
    return parseAndValidateBulletinDraft(firstResponse)
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
      return parseAndValidateBulletinDraft(retryResponse)
    } catch (retryError) {
      console.error('[bulletin:generation] validation finale echouee', retryError)
      throw new Error('INVALID_BULLETIN_GENERATION')
    }
  }
}
