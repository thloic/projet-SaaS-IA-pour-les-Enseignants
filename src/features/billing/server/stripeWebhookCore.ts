import { ambassadorDiscountPercent } from './ambassadorCore.ts'

// `current_period_end` vit sur chaque item de l'abonnement (pas sur
// l'abonnement lui-même) dans la version du SDK Stripe installée — vérifié
// dans node_modules/stripe, pas supposé.
export interface StripeSubscriptionLike {
  id: string
  customer: string
  status: string
  cancel_at_period_end: boolean
  metadata: Record<string, string>
  items: {
    data: Array<{ current_period_end: number; price: { recurring: { interval: string } | null } }>
  }
}

export interface StripeCheckoutSessionLike {
  subscription: string | null
  client_reference_id: string | null
}

export interface StripeEventLike {
  id: string
  type: string
  data: { object: unknown }
}

export interface SubscriptionUpsert {
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: string
  priceInterval: string | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
}

export interface WebhookRepository {
  isEventProcessed(eventId: string): Promise<boolean>
  // Enregistrée seulement APRÈS un traitement réussi (voir handleStripeEvent) :
  // si le traitement échoue et que la route répond 500, Stripe renvoie
  // l'événement et il doit pouvoir être retraité, pas être ignoré à tort
  // comme "déjà traité". Marquer avant traitement casserait ce retry.
  markEventProcessed(eventId: string, type: string): Promise<void>
  upsertSubscription(upsert: SubscriptionUpsert): Promise<void>
  // Enregistre qu'un filleul s'est abonné grâce au code d'un ambassadeur et
  // retourne le nombre total de filleuls de cet ambassadeur APRÈS
  // l'enregistrement — ou `null` si ce filleul avait déjà été enregistré
  // (pour n'importe quel ambassadeur, voir contrainte unique sur
  // `ambassador_redemptions.referred_user_id`, PRD-ambassadeurs.md US-11) :
  // dans ce cas, rien de nouveau à répercuter sur le rabais Stripe.
  recordAmbassadorReferral(ambassadorUserId: string, referredUserId: string): Promise<number | null>
  // Abonnement Stripe actif de l'ambassadeur, s'il en a déjà un — pour lui
  // répercuter son nouveau palier de réduction immédiatement (US-9). `null`
  // s'il n'est pas encore abonné : le rabais s'appliquera à son prochain
  // checkout (voir discountCouponId dans checkoutCore.ts).
  getAmbassadorStripeSubscriptionId(ambassadorUserId: string): Promise<string | null>
}

export interface WebhookDeps {
  repository: WebhookRepository
  retrieveSubscription(subscriptionId: string): Promise<StripeSubscriptionLike>
  // Applique le rabais correspondant au palier donné (10, 20… 100) sur
  // l'abonnement Stripe indiqué — jamais appelé avec 0 (voir handleCheckoutSessionCompleted).
  applyAmbassadorDiscount(stripeSubscriptionId: string, discountPercent: number): Promise<void>
}

function toSubscriptionUpsert(
  subscription: StripeSubscriptionLike,
  fallbackUserId: string | null
): SubscriptionUpsert | null {
  const userId = subscription.metadata?.supabase_user_id || fallbackUserId
  if (!userId) {
    console.error('[stripe-webhook] user_id introuvable pour l’abonnement', subscription.id)
    return null
  }

  const item = subscription.items.data[0]

  return {
    userId,
    stripeCustomerId: subscription.customer,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    priceInterval: item?.price.recurring?.interval ?? null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: item ? new Date(item.current_period_end * 1000).toISOString() : null,
  }
}

async function handleCheckoutSessionCompleted(
  session: StripeCheckoutSessionLike,
  deps: WebhookDeps
): Promise<void> {
  if (!session.subscription) return

  const subscription = await deps.retrieveSubscription(session.subscription)
  const upsert = toSubscriptionUpsert(subscription, session.client_reference_id)
  if (!upsert) return

  await deps.repository.upsertSubscription(upsert)

  // Uniquement au moment du checkout initial (pas sur les renouvellements
  // ultérieurs, qui repassent par customer.subscription.updated sans jamais
  // appeler cette fonction) : c'est le seul événement qui représente une
  // véritable nouvelle recommandation. `ambassadorUserId !== upsert.userId`
  // est une défense en profondeur — l'auto-recommandation est déjà bloquée
  // en amont, au moment de la création de la session de checkout.
  const ambassadorUserId = subscription.metadata?.ambassador_user_id
  if (!ambassadorUserId || ambassadorUserId === upsert.userId) return

  const referralCount = await deps.repository.recordAmbassadorReferral(ambassadorUserId, upsert.userId)
  if (referralCount === null) return // filleul déjà compté ailleurs : rien de nouveau à répercuter

  const ambassadorSubscriptionId = await deps.repository.getAmbassadorStripeSubscriptionId(ambassadorUserId)
  if (ambassadorSubscriptionId) {
    await deps.applyAmbassadorDiscount(ambassadorSubscriptionId, ambassadorDiscountPercent(referralCount))
  }
}

async function handleSubscriptionEvent(
  subscription: StripeSubscriptionLike,
  deps: WebhookDeps
): Promise<void> {
  const upsert = toSubscriptionUpsert(subscription, null)
  if (upsert) await deps.repository.upsertSubscription(upsert)
}

export async function handleStripeEvent(event: StripeEventLike, deps: WebhookDeps): Promise<void> {
  if (await deps.repository.isEventProcessed(event.id)) return

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as StripeCheckoutSessionLike, deps)
      break
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionEvent(event.data.object as StripeSubscriptionLike, deps)
      break
    default:
      // Type d'événement non géré : rien à faire, mais on le marque quand
      // même traité pour ne pas le retraiter inutilement à chaque retry Stripe.
      break
  }

  await deps.repository.markEventProcessed(event.id, event.type)
}
