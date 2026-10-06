import 'server-only'

import { generateText, Output } from 'ai'
import { getCurrentUserAnthropicModel } from '@/features/ai/server/aiProviderResolver'
import { recordCurrentUserAIUsage } from '@/features/ai/server/aiUsageRecorder'

import { followUpPlanReviewGeneratedSchema } from '../schemas/followUpPlanReviewSchema'

export async function generateStructuredFollowUpPlanReviewWithAnthropic(prompt: string): Promise<unknown> {
  const result = await generateText({
    model: await getCurrentUserAnthropicModel('follow_up_plan'),
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

  await recordCurrentUserAIUsage('follow_up_plan', 'agent', result.usage)

  return result.output
}
