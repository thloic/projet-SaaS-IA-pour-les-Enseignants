import 'server-only'

import { anthropic } from '@ai-sdk/anthropic'
import { generateText, Output } from 'ai'

import { followUpPlanGeneratedSchema } from '../schemas/followUpPlanSchema'

export async function generateStructuredFollowUpPlanWithAnthropic(prompt: string): Promise<unknown> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('MISSING_ANTHROPIC_API_KEY')

  const result = await generateText({
    model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
    output: Output.object({
      schema: followUpPlanGeneratedSchema,
      name: 'brouillon_plan_de_suivi',
      description: 'Brouillon de plan de suivi structuré, fondé uniquement sur les éléments fournis.',
    }),
    system:
      'Tu rédiges des brouillons de suivi pédagogique en français canadien. Tu appliques strictement la bienveillance, l’anti-hallucination et le schéma de sortie.',
    prompt,
    temperature: 0.2,
    maxOutputTokens: 2000,
    maxRetries: 1,
    timeout: 60000,
  })

  return result.output
}
