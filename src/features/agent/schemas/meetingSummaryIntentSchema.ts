import { z } from 'zod'

// Contrairement aux courriels parents, il n'y a pas de "motif" a classer ici :
// les notes elles-memes sont le contenu a structurer, jamais resumees a cette
// etape d'extraction.
export const meetingSummaryExtractionSchema = z
  .object({
    studentQuery: z.string().trim().min(1).nullable(),
    notes: z.string().trim().min(1).nullable(),
  })
  .strict()

export type MeetingSummaryExtraction = z.infer<typeof meetingSummaryExtractionSchema>

export interface ResolvedMeetingSummaryRequest {
  studentQuery: string
  notes: string
}

// Des notes trop courtes ne suffisent pas a produire un compte rendu fidele :
// on prefere redemander plutot que de laisser le modele etoffer de lui-meme
// un compte rendu a partir de presque rien.
const MIN_NOTES_LENGTH = 20

export function resolveMeetingSummaryExtraction(
  extraction: MeetingSummaryExtraction
): ResolvedMeetingSummaryRequest | null {
  if (!extraction.studentQuery || !extraction.notes) return null
  if (extraction.notes.length < MIN_NOTES_LENGTH) return null

  return { studentQuery: extraction.studentQuery, notes: extraction.notes }
}
