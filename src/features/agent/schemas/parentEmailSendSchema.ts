import { z } from 'zod'

export const parentEmailSendInputSchema = z.object({
  draftId: z.string().uuid(),
  to: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(150),
  body: z.string().trim().min(1),
})

export type ParentEmailSendInput = z.infer<typeof parentEmailSendInputSchema>
