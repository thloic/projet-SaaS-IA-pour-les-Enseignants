import type Stripe from 'stripe'

export interface BuildCheckoutSessionParamsInput {
  userId: string
  email: string
  interval: 'month' | 'year'
  existingCustomerId: string | null
  appUrl: string
  priceIds: { month: string; year: string }
  // user_id de l'ambassadeur dont le code a été indiqué par l'enseignant qui
  // s'abonne ici (le filleul) — déjà validé (existence, pas son propre code)
  // avant d'arriver ici. Ne modifie jamais le prix de CETTE session : le
  // webhook s'en sert uniquement pour créditer la recommandation côté
  // ambassadeur (voir docs/PLAN-ambassadeurs.md, Phase 2/3).
  ambassadorUserId?: string | null
  // Coupon Stripe correspondant au palier de réduction déjà accumulé par
  // l'enseignant qui s'abonne ici (s'il est lui-même ambassadeur d'un ou
  // plusieurs collègues). Résolu en amont (voir ambassador.ts) à partir de
  // son nombre de recommandations — jamais recalculé ici.
  discountCouponId?: string | null
}

export function buildCheckoutSessionParams({
  userId,
  email,
  interval,
  existingCustomerId,
  appUrl,
  priceIds,
  ambassadorUserId,
  discountCouponId,
}: BuildCheckoutSessionParamsInput): Stripe.Checkout.SessionCreateParams {
  const priceId = interval === 'month' ? priceIds.month : priceIds.year
  if (!priceId) {
    throw new Error(`STRIPE_PRICE_ID_MISSING_FOR_INTERVAL_${interval}`)
  }

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId,
    success_url: `${appUrl}/settings?checkout=success`,
    cancel_url: `${appUrl}/settings?checkout=cancelled`,
    subscription_data: {
      metadata: {
        supabase_user_id: userId,
        ...(ambassadorUserId ? { ambassador_user_id: ambassadorUserId } : {}),
      },
    },
  }

  if (existingCustomerId) {
    params.customer = existingCustomerId
  } else {
    params.customer_email = email
  }

  if (discountCouponId) {
    params.discounts = [{ coupon: discountCouponId }]
  }

  return params
}
