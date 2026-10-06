import 'server-only'

import { generateText, Output } from 'ai'
import { getCurrentUserAnthropicModel } from '@/features/ai/server/aiProviderResolver'
import { recordCurrentUserAIUsage } from '@/features/ai/server/aiUsageRecorder'

import { followUpPlanGeneratedSchema } from '../schemas/followUpPlanSchema'

export async function generateStructuredFollowUpPlanWithAnthropic(prompt: string): Promise<unknown> {
  const result = await generateText({
    model: await getCurrentUserAnthropicModel('follow_up_plan'),
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

  await recordCurrentUserAIUsage('follow_up_plan', 'agent', result.usage)

  return result.output
}
