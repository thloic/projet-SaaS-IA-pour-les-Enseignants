import 'server-only'

import { generateText, Output } from 'ai'
import { getCurrentUserAnthropicModel } from '@/features/ai/server/aiProviderResolver'
import { recordCurrentUserAIUsage } from '@/features/ai/server/aiUsageRecorder'

import { meetingSummaryDraftSchema } from '../schemas/meetingSummarySchema'

export async function generateStructuredMeetingSummaryWithAnthropic(prompt: string): Promise<unknown> {
  const result = await generateText({
    model: await getCurrentUserAnthropicModel('meeting_summary'),
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

  await recordCurrentUserAIUsage('meeting_summary', 'agent', result.usage)

  return result.output
}
