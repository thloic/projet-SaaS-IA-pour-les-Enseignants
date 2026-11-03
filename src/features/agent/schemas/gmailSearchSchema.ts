import { z } from 'zod'

export const gmailSearchToolInputSchema = z.object({
  query: z.string().trim().min(1).max(200),
})

export const gmailSearchResultItemSchema = z.object({
  id: z.string().min(1),
  from: z.string().nullable(),
  subject: z.string().nullable(),
  date: z.string().nullable(),
  snippet: z.string().nullable(),
})

// Jamais une erreur lancee sur "pas connecte" : le statut needs_connection
// permet a l'appelant (route.ts) de transformer ca en carte de connexion
// dans le fil, plutot qu'en echec du tour de chat.
export const gmailSearchToolOutputSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), results: z.array(gmailSearchResultItemSchema) }),
  z.object({ status: z.literal('needs_connection'), feature: z.literal('gmail_read') }),
  z.object({ status: z.literal('error') }),
])

export type GmailSearchToolInput = z.infer<typeof gmailSearchToolInputSchema>
export type GmailSearchToolOutput = z.infer<typeof gmailSearchToolOutputSchema>
