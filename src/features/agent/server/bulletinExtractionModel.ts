import 'server-only'

import { anthropic } from '@ai-sdk/anthropic'
import { generateText, Output } from 'ai'

import { bulletinExtractionSchema } from '../schemas/bulletinIntentSchema'

export async function extractBulletinFieldsWithAnthropic(message: string): Promise<unknown> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('MISSING_ANTHROPIC_API_KEY')

  const result = await generateText({
    model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
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

  return result.output
}
