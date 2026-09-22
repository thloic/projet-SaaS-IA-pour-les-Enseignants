import 'server-only'

import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

export async function generateExamVariantTextWithAnthropic(
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal
): Promise<string> {
  const result = await generateText({
    model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.3,
    maxOutputTokens: 4500,
    maxRetries: 1,
    timeout: 60000,
    abortSignal: signal,
  })

  return result.text
}
