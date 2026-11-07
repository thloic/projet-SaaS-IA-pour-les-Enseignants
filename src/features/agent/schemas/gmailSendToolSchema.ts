import { z } from 'zod'

export const gmailSendToolInputSchema = z.object({
  to: z.string().email('L\'adresse destinataire doit être valide'),
  subject: z.string().trim().min(1, 'Le sujet ne peut pas être vide').max(200),
  body: z.string().trim().min(1, 'Le corps du message ne peut pas être vide'),
  // Obligatoire : sans brouillon persisté, « marquer envoyé » ne toucherait
  // aucune ligne. Le contrôle est fait ici, avant toute exécution de l'outil.
  draftId: z.string().uuid('Brouillon introuvable : générez d\'abord le courriel.'),
})

export const gmailSendToolOutputSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    messageId: z.string(),
  }),
  z.object({
    status: z.literal('needs_connection'),
    feature: z.literal('gmail'),
  }),
  z.object({
    status: z.literal('error'),
    reason: z.string().optional(),
  }),
])

export type GmailSendToolInput = z.infer<typeof gmailSendToolInputSchema>
export type GmailSendToolOutput = z.infer<typeof gmailSendToolOutputSchema>
