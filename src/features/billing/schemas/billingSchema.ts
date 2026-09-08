import { z } from 'zod'

export const checkoutInputSchema = z.object({
  interval: z.enum(['month', 'year']),
  // Code d'un collègue (ambassadeur) indiqué par l'enseignant qui s'abonne
  // ici — optionnel, ne change jamais son propre prix (voir PRD-ambassadeurs.md).
  promoCode: z.string().trim().min(1).max(20).optional(),
})

export type CheckoutInput = z.infer<typeof checkoutInputSchema>
