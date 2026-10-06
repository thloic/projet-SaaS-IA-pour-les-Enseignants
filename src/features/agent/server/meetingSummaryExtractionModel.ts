import 'server-only'

import { generateText, Output } from 'ai'
import { getCurrentUserAnthropicModel } from '@/features/ai/server/aiProviderResolver'
import { recordCurrentUserAIUsage } from '@/features/ai/server/aiUsageRecorder'

import { meetingSummaryExtractionSchema } from '../schemas/meetingSummaryIntentSchema'

export async function extractMeetingSummaryFieldsWithAnthropic(message: string): Promise<unknown> {
  const result = await generateText({
    model: await getCurrentUserAnthropicModel('field_extraction'),
    output: Output.object({
      schema: meetingSummaryExtractionSchema,
      name: 'demande_compte_rendu_rencontre',
      description: 'Champs d’une demande de compte rendu de rencontre parent extraits d’un message d’enseignant.',
    }),
    system: [
      'Tu extrais les champs d’une demande de compte rendu de rencontre parent depuis le message d’un enseignant.',
      'Si un champ n’est pas mentionné clairement dans le message, retourne null pour ce champ précis — n’invente jamais de valeur.',
      'Le champ studentQuery est le nom ou prénom de l’élève tel qu’écrit par l’enseignant, sans le reformuler.',
      'Le champ notes reprend intégralement le contenu des notes tapées par l’enseignant sur la rencontre, sans les résumer ni les reformuler — copie le texte tel quel, en retirant seulement la formule de demande elle-même (ex. « fais-moi un compte rendu »).',
    ].join('\n'),
    prompt: message,
    temperature: 0,
    maxOutputTokens: 1000,
    maxRetries: 1,
    timeout: 20000,
  })

  await recordCurrentUserAIUsage('field_extraction', 'agent', result.usage)

  return result.output
}
