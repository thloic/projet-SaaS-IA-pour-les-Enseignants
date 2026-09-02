import type Stripe from 'stripe'

export function buildPortalSessionParams({
  stripeCustomerId,
  appUrl,
}: {
  stripeCustomerId: string | null
  appUrl: string
}): Stripe.BillingPortal.SessionCreateParams {
  if (!stripeCustomerId) {
    throw new Error('NO_STRIPE_CUSTOMER')
  }

  return {
    customer: stripeCustomerId,
    return_url: `${appUrl}/settings`,
  }
}
