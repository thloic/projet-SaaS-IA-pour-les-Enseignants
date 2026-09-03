import { getCurrentUser } from '@/features/profile/server/profile'
import { getSubscriptionSummary } from '@/features/billing/server/subscription'
import PricingView from '@/features/billing/components/PricingView'

export default async function PricingPage() {
  const user = await getCurrentUser()
  const subscription = user
    ? await getSubscriptionSummary(user.id)
    : { plan: 'free' as const, interval: null, currentPeriodEnd: null, cancelAtPeriodEnd: false }

  return (
    <PricingView
      currentPlan={subscription.plan}
      currentInterval={subscription.interval}
    />
  )
}
