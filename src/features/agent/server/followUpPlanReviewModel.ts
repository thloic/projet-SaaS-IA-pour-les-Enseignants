import 'server-only'

import { anthropic } from '@ai-sdk/anthropic'
import { generateText, Output } from 'ai'

import { followUpPlanReviewGeneratedSchema } from '../schemas/followUpPlanReviewSchema'

export async function generateStructuredFollowUpPlanReviewWithAnthropic(prompt: string): Promise<unknown> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('MISSING_ANTHROPIC_API_KEY')

  const result = await generateText({
    model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
    output: Output.object({
      schema: followUpPlanReviewGeneratedSchema,
      name: 'bilan_de_revision',
      description: 'Bilan de révision d’un plan de suivi, fondé uniquement sur les statuts réels de ses objectifs.',
    }),
    system:
      'Tu rédiges des bilans de révision pédagogique en français canadien. Tu appliques strictement la bienveillance et l’anti-hallucination.',
    prompt,
    temperature: 0.2,
    maxOutputTokens: 500,
    maxRetries: 1,
    timeout: 45000,
  })

  return result.output
}
