import { getCurrentUser } from '@/features/profile/server/profile'
import { getStripeCustomerId } from '@/features/billing/server/subscription'
import { checkoutInputSchema } from '@/features/billing/schemas/billingSchema'
import { buildCheckoutSessionParams } from '@/features/billing/server/checkoutCore'
import { getStripe } from '@/lib/stripe/client'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = checkoutInputSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'INVALID_INPUT' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  const existingCustomerId = await getStripeCustomerId(user.id)

  try {
    const params = buildCheckoutSessionParams({
      userId: user.id,
      email: user.email ?? '',
      interval: parsed.data.interval,
      existingCustomerId,
      appUrl,
      priceIds: {
        month: process.env.STRIPE_PRICE_ID_MONTHLY!,
        year: process.env.STRIPE_PRICE_ID_ANNUAL!,
      },
    })

    const session = await getStripe().checkout.sessions.create(params)
    return Response.json({ url: session.url })
  } catch (error) {
    console.error('[billing:checkout] création de la session refusée', error)
    return Response.json({ error: 'CHECKOUT_SESSION_FAILED' }, { status: 500 })
  }
}
