// Reflète exactement Stripe.Subscription.Status (SDK `stripe`) — 'trialing' et
// 'paused' ne sont jamais produits par ce chantier (pas d'essai gratuit, pas
// de mise en pause), mais un statut Stripe légitime non couvert ferait
// échouer la contrainte de la table et bloquerait le webhook en boucle.
export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'paused'

export interface SubscriptionRecord {
  stripeCustomerId: string
  stripeSubscriptionId: string | null
  status: SubscriptionStatus
  stripePriceId: string | null
  priceInterval: 'month' | 'year' | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
}

export interface SubscriptionRepository {
  getSubscription(userId: string): Promise<SubscriptionRecord | null>
}

export interface SubscriptionSummary {
  plan: 'free' | 'pro'
  interval: 'month' | 'year' | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

// Statuts qui donnent droit à l'accès Pro : 'active' bien sûr, et 'past_due'
// pour la période de grâce après un échec de paiement (voir PRD-abonnements.md,
// décision "échec de paiement au renouvellement" — jamais de coupure brutale).
const PRO_ACCESS_STATUSES: SubscriptionStatus[] = ['active', 'past_due']

// Le statut Stripe seul ne suffit pas : un abonnement actif sur un ancien
// produit, un prix inconnu ou un mauvais intervalle ne doit jamais accorder
// silencieusement l'accès à la participation actuelle (voir le plan de
// migration BYOK/participation — Lot 3).
function hasAllowedParticipationPrice(record: SubscriptionRecord, allowedPriceIds: string[]): boolean {
  return record.stripePriceId !== null && allowedPriceIds.includes(record.stripePriceId)
}

export async function hasActiveProAccessCore(
  userId: string,
  repository: SubscriptionRepository,
  allowedPriceIds: string[]
): Promise<boolean> {
  const subscription = await repository.getSubscription(userId)
  return (
    subscription !== null &&
    PRO_ACCESS_STATUSES.includes(subscription.status) &&
    hasAllowedParticipationPrice(subscription, allowedPriceIds)
  )
}

export async function getSubscriptionSummaryCore(
  userId: string,
  repository: SubscriptionRepository,
  allowedPriceIds: string[]
): Promise<SubscriptionSummary> {
  const subscription = await repository.getSubscription(userId)
  const isPro =
    subscription !== null &&
    PRO_ACCESS_STATUSES.includes(subscription.status) &&
    hasAllowedParticipationPrice(subscription, allowedPriceIds)

  if (!isPro || !subscription) {
    return { plan: 'free', interval: null, currentPeriodEnd: null, cancelAtPeriodEnd: false }
  }

  return {
    plan: 'pro',
    interval: subscription.priceInterval,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  }
}
