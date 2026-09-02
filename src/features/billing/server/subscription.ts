import 'server-only'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import {
  getSubscriptionSummaryCore,
  hasActiveProAccessCore,
  type SubscriptionRecord,
  type SubscriptionRepository,
  type SubscriptionSummary,
} from '@/features/billing/server/subscriptionCore'

interface SubscriptionRow {
  stripe_customer_id: string
  stripe_subscription_id: string | null
  status: SubscriptionRecord['status']
  price_interval: SubscriptionRecord['priceInterval']
  cancel_at_period_end: boolean
  current_period_end: string | null
}

// Une seule requête Supabase par userId par request, même si hasActiveProAccess()
// et getSubscriptionSummary() sont appelés en parallèle dans la même page.
const fetchSubscription = cache(async (userId: string): Promise<SubscriptionRecord | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, status, price_interval, cancel_at_period_end, current_period_end')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error("[billing:subscription] lecture de l’abonnement refusée", error)
    return null
  }

  if (!data) return null

  const row = data as SubscriptionRow
  return {
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    status: row.status,
    priceInterval: row.price_interval,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    currentPeriodEnd: row.current_period_end,
  }
})

function createRepository(): SubscriptionRepository {
  return { getSubscription: fetchSubscription }
}

export async function hasActiveProAccess(userId: string): Promise<boolean> {
  return hasActiveProAccessCore(userId, createRepository())
}

export async function getSubscriptionSummary(userId: string): Promise<SubscriptionSummary> {
  return getSubscriptionSummaryCore(userId, createRepository())
}

// Utilisé par le checkout pour réutiliser un `stripe_customer_id` existant
// (même si l'abonnement précédent est résilié) plutôt que d'en recréer un.
export async function getStripeCustomerId(userId: string): Promise<string | null> {
  const subscription = await fetchSubscription(userId)
  return subscription?.stripeCustomerId ?? null
}
