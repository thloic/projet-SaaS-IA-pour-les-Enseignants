import 'server-only'

import { generateText, Output } from 'ai'
import { getCurrentUserAnthropicModel } from '@/features/ai/server/aiProviderResolver'
import { recordCurrentUserAIUsage } from '@/features/ai/server/aiUsageRecorder'

import { parentEmailDraftSchema } from '../schemas/parentEmailSchema'

export async function translateStructuredParentEmailWithAnthropic(prompt: string): Promise<unknown> {
  const result = await generateText({
    model: await getCurrentUserAnthropicModel('translation'),
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

  await recordCurrentUserAIUsage('translation', 'agent', result.usage)

  return result.output
}
