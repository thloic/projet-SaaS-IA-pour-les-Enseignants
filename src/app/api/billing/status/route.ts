import { getCurrentUser } from '@/features/profile/server/profile'
import { getSubscriptionSummary } from '@/features/billing/server/subscription'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ plan: 'free' })
  const subscription = await getSubscriptionSummary(user.id)
  return Response.json({ plan: subscription.plan })
}
