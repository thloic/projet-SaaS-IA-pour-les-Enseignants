import type Stripe from 'stripe'

export interface BuildCheckoutSessionParamsInput {
  userId: string
  email: string
  interval: 'month' | 'year'
  existingCustomerId: string | null
  appUrl: string
  priceIds: { month: string; year: string }
}

export function buildCheckoutSessionParams({
  userId,
  email,
  interval,
  existingCustomerId,
  appUrl,
  priceIds,
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
      metadata: { supabase_user_id: userId },
    },
  }

  if (existingCustomerId) {
    params.customer = existingCustomerId
  } else {
    params.customer_email = email
  }

  return params
}
