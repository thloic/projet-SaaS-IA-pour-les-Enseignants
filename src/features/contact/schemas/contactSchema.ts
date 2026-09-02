import { z } from 'zod'

export const contactReasonValues = [
  'demo',
  'teacher_subscription',
  'school',
  'district',
  'support',
  'partnership',
  'other',
] as const

export const contactReasonSchema = z.enum(contactReasonValues)

export const contactSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().max(30),
    organization: z.string().trim().max(150),
    reason: contactReasonSchema,
    message: z.string().trim().min(20).max(4_000),
    locale: z.enum(['en', 'fr', 'es']),
    website: z.string().max(0),
  })
  .strict()

export type ContactInput = z.infer<typeof contactSchema>
export type ContactReason = z.infer<typeof contactReasonSchema>
