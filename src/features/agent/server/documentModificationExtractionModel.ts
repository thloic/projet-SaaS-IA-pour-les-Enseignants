import 'server-only'

import { generateText, Output } from 'ai'
import { getCurrentUserAnthropicModel } from '@/features/ai/server/aiProviderResolver'
import { recordCurrentUserAIUsage } from '@/features/ai/server/aiUsageRecorder'
import { documentModificationExtractionSchema } from '@/features/agent/schemas/documentModificationSchema'

export async function extractDocumentModificationFieldsWithAnthropic(message: string): Promise<unknown> {
  const result = await generateText({
    model: await getCurrentUserAnthropicModel('field_extraction'),
    output: Output.object({
      schema: documentModificationExtractionSchema,
      name: 'modification_document_scolaire',
      description: 'Élève, type de document et instruction précise extraits de la demande.',
    }),
    system: [
      'Tu extrais une demande de modification d’un document scolaire existant.',
      'studentQuery est le nom de l’élève exactement comme écrit.',
      'documentType vaut pat pour un PAT/plan d’appui/support plan/plan de apoyo, ou bulletin pour un commentaire de bulletin/report card/boletín.',
      'instruction décrit uniquement le changement demandé, sans inventer de détail.',
      'Retourne null pour tout champ qui n’est pas clairement déterminable.',
    ].join('\n'),
    prompt: message,
    temperature: 0,
    maxOutputTokens: 350,
    maxRetries: 1,
    timeout: 20000,
  })
  await recordCurrentUserAIUsage('field_extraction', 'agent', result.usage)
  return result.output
}
