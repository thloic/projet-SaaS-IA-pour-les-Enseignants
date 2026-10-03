import 'server-only'

import { anthropic } from '@ai-sdk/anthropic'
import { generateText, Output } from 'ai'

import { parentEmailDraftSchema } from '../schemas/parentEmailSchema'

export async function generateStructuredParentEmailWithAnthropic(prompt: string): Promise<unknown> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('MISSING_ANTHROPIC_API_KEY')

  const result = await generateText({
    model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
    output: Output.object({
      schema: parentEmailDraftSchema,
      name: 'brouillon_courriel_parents',
      description: 'Brouillon de courriel aux parents, fondé uniquement sur les éléments fournis.',
    }),
    system:
      'Tu rédiges des brouillons de courriels aux parents d’élèves en français canadien. Tu appliques strictement la bienveillance, l’anti-hallucination et le schéma de sortie.',
    prompt,
    temperature: 0.3,
    maxOutputTokens: 1200,
    maxRetries: 1,
    timeout: 60000,
  })

  return result.output
}
