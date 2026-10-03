import 'server-only'

import { anthropic } from '@ai-sdk/anthropic'
import { generateText, Output } from 'ai'

import { parentEmailDraftSchema } from '../schemas/parentEmailSchema'

export async function translateStructuredParentEmailWithAnthropic(prompt: string): Promise<unknown> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('MISSING_ANTHROPIC_API_KEY')

  const result = await generateText({
    model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
    output: Output.object({
      schema: parentEmailDraftSchema,
      name: 'traduction_courriel_parents',
      description: 'Traduction fidèle d’un brouillon de courriel aux parents, sans ajout ni omission.',
    }),
    system:
      'Tu traduis fidèlement des courriels destinés aux parents d’élèves. Tu ne reformules jamais, tu ne résumes jamais, tu n’ajoutes et n’enlèves aucune information. Tu appliques strictement le schéma de sortie.',
    prompt,
    temperature: 0.1,
    maxOutputTokens: 1200,
    maxRetries: 1,
    timeout: 60000,
  })

  return result.output
}
