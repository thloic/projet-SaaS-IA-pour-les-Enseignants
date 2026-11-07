import 'server-only'

import { generateText } from 'ai'
import { getCurrentUserAnthropicModel } from '@/features/ai/server/aiProviderResolver'
import { recordCurrentUserAIUsage } from '@/features/ai/server/aiUsageRecorder'

export async function generateStudyQuestionnaireTextWithAnthropic(
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal
): Promise<string> {
  const result = await generateText({
    model: await getCurrentUserAnthropicModel('study_questionnaire'),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.3,
    maxOutputTokens: 4500,
    maxRetries: 1,
    timeout: 60000,
    abortSignal: signal,
  })

  await recordCurrentUserAIUsage('study_questionnaire', 'general', result.usage)

  return result.text
}
