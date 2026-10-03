import 'server-only'

import { anthropic } from '@ai-sdk/anthropic'
import { generateText, Output } from 'ai'

import { meetingSummaryDraftSchema } from '../schemas/meetingSummarySchema'

export async function generateStructuredMeetingSummaryWithAnthropic(prompt: string): Promise<unknown> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('MISSING_ANTHROPIC_API_KEY')

  const result = await generateText({
    model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
    output: Output.object({
      schema: meetingSummaryDraftSchema,
      name: 'compte_rendu_rencontre_parent',
      description: 'Compte rendu structuré d’une rencontre avec des parents, fondé uniquement sur les notes fournies.',
    }),
    system:
      'Tu structures des notes d’enseignant sur une rencontre avec des parents, en français canadien. Tu n’ajoutes jamais d’information absente des notes et tu appliques strictement le schéma de sortie.',
    prompt,
    temperature: 0.2,
    maxOutputTokens: 1200,
    maxRetries: 1,
    timeout: 60000,
  })

  return result.output
}
