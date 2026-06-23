import { z } from 'zod'

export const magicLinkSchema = z.object({
  email: z.email('Email invalide'),
})

export type MagicLinkInput = z.infer<typeof magicLinkSchema>
