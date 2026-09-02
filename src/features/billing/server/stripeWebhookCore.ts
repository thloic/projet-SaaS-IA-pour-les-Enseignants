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
}

export interface WebhookDeps {
  repository: WebhookRepository
  retrieveSubscription(subscriptionId: string): Promise<StripeSubscriptionLike>
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
  if (upsert) await deps.repository.upsertSubscription(upsert)
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
