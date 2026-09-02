import { z } from 'zod'

export const checkoutInputSchema = z.object({
  interval: z.enum(['month', 'year']),
})

export type CheckoutInput = z.infer<typeof checkoutInputSchema>
