import { getCurrentUser } from '@/features/profile/server/profile'
import { getStripeCustomerId } from '@/features/billing/server/subscription'
import { buildPortalSessionParams } from '@/features/billing/server/portalCore'
import { getStripe } from '@/lib/stripe/client'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 })

  const stripeCustomerId = await getStripeCustomerId(user.id)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin

  try {
    const params = buildPortalSessionParams({ stripeCustomerId, appUrl })
    const session = await getStripe().billingPortal.sessions.create(params)
    return Response.json({ url: session.url })
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_STRIPE_CUSTOMER') {
      return Response.json({ error: 'NO_SUBSCRIPTION' }, { status: 400 })
    }
    console.error('[billing:portal] création de la session refusée', error)
    return Response.json({ error: 'PORTAL_SESSION_FAILED' }, { status: 500 })
  }
}
