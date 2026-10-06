import 'server-only'

import { generateText } from 'ai'
import { getCurrentUserAnthropicModel } from '@/features/ai/server/aiProviderResolver'
import { recordCurrentUserAIUsage } from '@/features/ai/server/aiUsageRecorder'

export async function generateExamVariantTextWithAnthropic(
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal
): Promise<string> {
  const result = await generateText({
    model: await getCurrentUserAnthropicModel('exam_variant'),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.3,
    maxOutputTokens: 4500,
    maxRetries: 1,
    timeout: 60000,
    abortSignal: signal,
  })

  await recordCurrentUserAIUsage('exam_variant', 'general', result.usage)

  return result.text
}
