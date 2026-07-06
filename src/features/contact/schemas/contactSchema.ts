import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  subject: z.string().trim().min(3).max(200),
  phone: z.string().trim().min(6).max(30),
})

export type ContactInput = z.infer<typeof contactSchema>
