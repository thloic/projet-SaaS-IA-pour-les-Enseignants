import 'server-only'

import { generateText, Output } from 'ai'
import { getCurrentUserAnthropicModel } from '@/features/ai/server/aiProviderResolver'
import { recordCurrentUserAIUsage } from '@/features/ai/server/aiUsageRecorder'

import { parentEmailExtractionSchema } from '../schemas/parentEmailIntentSchema'

export async function extractParentEmailFieldsWithAnthropic(message: string): Promise<unknown> {
  const result = await generateText({
    model: await getCurrentUserAnthropicModel('field_extraction'),
    output: Output.object({
      schema: parentEmailExtractionSchema,
      name: 'demande_courriel_parents',
      description: 'Champs d’une demande de courriel aux parents extraits d’un message d’enseignant.',
    }),
    system: [
      'Tu extrais les champs d’une demande de courriel aux parents depuis le message d’un enseignant.',
      'Si un champ n’est pas mentionné clairement dans le message, retourne null pour ce champ précis — n’invente jamais de valeur.',
      'Le champ studentQuery est le nom ou prénom de l’élève tel qu’écrit par l’enseignant, sans le reformuler.',
      'Le champ register classe le motif du courriel parmi exactement : "comportement" (comportement en classe), "echec" (difficulté ou échec académique), "plagiat" (plagiat ou tricherie), "autre" (tout le reste). Choisis "autre" seulement si aucun des trois premiers motifs ne correspond clairement.',
      'Le champ situation reprend les détails concrets donnés par l’enseignant sur la situation (ce qui s’est passé), sans les inventer ni les généraliser au-delà de ce qui est écrit.',
      'Le champ parentEmail est l’adresse courriel du parent si l’enseignant l’a explicitement donnée dans son message (ex. « leur email c’est... »), telle quelle, sans la corriger ni la deviner.',
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
