import 'server-only'

import { generateText, Output } from 'ai'
import { getCurrentUserAnthropicModel } from '@/features/ai/server/aiProviderResolver'
import { recordCurrentUserAIUsage } from '@/features/ai/server/aiUsageRecorder'

import { PATSchema } from '../schemas/patSchema'

export async function generateStructuredPATWithAnthropic(
  prompt: string,
  attachment?: { base64: string; mediaType: string }
): Promise<unknown> {
  const result = await generateText({
    model: await getCurrentUserAnthropicModel('pat'),
    output: Output.object({
      schema: PATSchema,
      name: 'plan_appui_temporaire',
      description: 'Plan d’appui temporaire structuré et fondé uniquement sur le contexte élève.',
    }),
    system:
      'Tu rédiges des documents scolaires institutionnels en français canadien. Tu appliques strictement la bienveillance, l’anti-hallucination et le schéma de sortie.',
    prompt: attachment
      ? [
          {
            role: 'user' as const,
            content: [
              { type: 'text' as const, text: prompt },
              { type: 'file' as const, data: attachment.base64, mediaType: attachment.mediaType },
            ],
          },
        ]
      : prompt,
    temperature: 0.2,
    maxOutputTokens: 3000,
    maxRetries: 1,
    timeout: 60000,
  })

  await recordCurrentUserAIUsage('pat', 'agent', result.usage)

  return result.output
}
