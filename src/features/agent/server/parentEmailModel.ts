import 'server-only'

import { generateText, Output } from 'ai'
import { getCurrentUserAnthropicModel } from '@/features/ai/server/aiProviderResolver'
import { recordCurrentUserAIUsage } from '@/features/ai/server/aiUsageRecorder'

import { parentEmailDraftSchema } from '../schemas/parentEmailSchema'

export async function generateStructuredParentEmailWithAnthropic(prompt: string): Promise<unknown> {
  const result = await generateText({
    model: await getCurrentUserAnthropicModel('parent_email'),
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

  await recordCurrentUserAIUsage('parent_email', 'agent', result.usage)

  return result.output
}
