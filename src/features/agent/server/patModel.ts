import 'server-only'

import { anthropic } from '@ai-sdk/anthropic'
import { generateText, Output } from 'ai'

import { PATSchema } from '../schemas/patSchema'

export async function generateStructuredPATWithAnthropic(prompt: string): Promise<unknown> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('MISSING_ANTHROPIC_API_KEY')

  const result = await generateText({
    model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
    output: Output.object({
      schema: PATSchema,
      name: 'plan_appui_temporaire',
      description: 'Plan d’appui temporaire structuré et fondé uniquement sur le contexte élève.',
    }),
    system:
      'Tu rédiges des documents scolaires institutionnels en français canadien. Tu appliques strictement la bienveillance, l’anti-hallucination et le schéma de sortie.',
    prompt,
    temperature: 0.2,
    maxOutputTokens: 3000,
    maxRetries: 1,
    timeout: 60000,
  })

  return result.output
}
