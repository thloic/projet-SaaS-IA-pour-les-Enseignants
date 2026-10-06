import 'server-only'

import { generateText, Output } from 'ai'
import { getCurrentUserAnthropicModel } from '@/features/ai/server/aiProviderResolver'
import { recordCurrentUserAIUsage } from '@/features/ai/server/aiUsageRecorder'

import { bulletinExtractionSchema } from '../schemas/bulletinIntentSchema'

export async function extractBulletinFieldsWithAnthropic(message: string): Promise<unknown> {
  const result = await generateText({
    model: await getCurrentUserAnthropicModel('field_extraction'),
    output: Output.object({
      schema: bulletinExtractionSchema,
      name: 'demande_bulletin',
      description: 'Champs d’une demande de commentaire de bulletin extraits d’un message d’enseignant.',
    }),
    system: [
      'Tu extrais les champs d’une demande de commentaire de bulletin depuis le message d’un enseignant.',
      'Si un champ n’est pas mentionné clairement dans le message, retourne null pour ce champ précis — n’invente jamais de valeur.',
      'Le champ studentQuery est le nom ou prénom de l’élève tel qu’écrit par l’enseignant, sans le reformuler.',
    ].join('\n'),
    prompt: message,
    temperature: 0,
    maxOutputTokens: 300,
    maxRetries: 1,
    timeout: 20000,
  })

  await recordCurrentUserAIUsage('field_extraction', 'agent', result.usage)

  return result.output
}
