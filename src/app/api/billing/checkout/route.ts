import { getCurrentUser } from '@/features/profile/server/profile'
import { getStripeCustomerId } from '@/features/billing/server/subscription'
import {
  findAmbassadorUserIdByCode,
  getAmbassadorCouponId,
  getAmbassadorReferralCount,
} from '@/features/billing/server/ambassador'
import { ambassadorDiscountPercent } from '@/features/billing/server/ambassadorCore'
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

  let ambassadorUserId: string | null = null
  if (parsed.data.promoCode) {
    const normalizedCode = parsed.data.promoCode.toUpperCase()
    const foundUserId = await findAmbassadorUserIdByCode(normalizedCode)
    if (!foundUserId) {
      return Response.json({ error: 'INVALID_PROMO_CODE' }, { status: 400 })
    }
    if (foundUserId === user.id) {
      return Response.json({ error: 'OWN_PROMO_CODE_NOT_ALLOWED' }, { status: 400 })
    }
    ambassadorUserId = foundUserId
  }

  const appUrl = new URL(req.url).origin
  const existingCustomerId = await getStripeCustomerId(user.id)

  // Si l'enseignant qui s'abonne ici est lui-même ambassadeur d'un ou
  // plusieurs collègues, son propre rabais accumulé s'applique dès ce
  // checkout (US-10) — indépendant du champ `promoCode` ci-dessus, qui
  // concerne uniquement le code d'un AUTRE ambassadeur qu'il indiquerait.
  const ownReferralCount = await getAmbassadorReferralCount(user.id)
  const discountCouponId = getAmbassadorCouponId(ambassadorDiscountPercent(ownReferralCount))

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
      ambassadorUserId,
      discountCouponId,
    })

    const session = await getStripe().checkout.sessions.create(params)
    return Response.json({ url: session.url })
  } catch (error) {
    console.error('[billing:checkout] création de la session refusée', error)
    return Response.json({ error: 'CHECKOUT_SESSION_FAILED' }, { status: 500 })
  }
}
