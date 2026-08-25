import 'server-only'

import { anthropic } from '@ai-sdk/anthropic'
import { generateText, Output } from 'ai'
import { documentModificationExtractionSchema } from '@/features/agent/schemas/documentModificationSchema'

export async function extractDocumentModificationFieldsWithAnthropic(message: string): Promise<unknown> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('MISSING_ANTHROPIC_API_KEY')

  const result = await generateText({
    model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
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
  return result.output
}
