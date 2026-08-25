import { z } from 'zod'

export const documentModificationExtractionSchema = z.object({
  studentQuery: z.string().trim().min(1).nullable(),
  documentType: z.enum(['pat', 'bulletin']).nullable(),
  instruction: z.string().trim().min(1).max(2000).nullable(),
}).strict()

export type DocumentModificationExtraction = z.infer<typeof documentModificationExtractionSchema>

export interface ResolvedDocumentModification {
  studentQuery: string
  documentType: 'pat' | 'bulletin'
  instruction: string
}

export function resolveDocumentModification(
  extraction: DocumentModificationExtraction
): ResolvedDocumentModification | null {
  if (!extraction.studentQuery || !extraction.documentType || !extraction.instruction) return null
  return {
    studentQuery: extraction.studentQuery,
    documentType: extraction.documentType,
    instruction: extraction.instruction,
  }
}
