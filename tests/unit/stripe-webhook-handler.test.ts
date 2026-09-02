import assert from 'node:assert/strict'
import test from 'node:test'

import {
  handleStripeEvent,
  type StripeSubscriptionLike,
  type SubscriptionUpsert,
  type WebhookDeps,
} from '../../src/features/billing/server/stripeWebhookCore.ts'

const USER_A = '11111111-1111-4111-8111-111111111111'

function fakeSubscription(overrides: Partial<StripeSubscriptionLike> = {}): StripeSubscriptionLike {
  return {
    id: 'sub_123',
    customer: 'cus_123',
    status: 'active',
    cancel_at_period_end: false,
    metadata: { supabase_user_id: USER_A },
    items: {
      data: [{ current_period_end: 1_800_000_000, price: { recurring: { interval: 'month' } } }],
    },
    ...overrides,
  }
}

function fakeDeps(subscriptionsById: Record<string, StripeSubscriptionLike> = {}) {
  const processedEventIds = new Set<string>()
  const upserts: SubscriptionUpsert[] = []
  const retrieveCalls: string[] = []

  const deps: WebhookDeps = {
    repository: {
      async isEventProcessed(eventId) {
        return processedEventIds.has(eventId)
      },
      async markEventProcessed(eventId) {
        processedEventIds.add(eventId)
      },
      async upsertSubscription(upsert) {
        upserts.push(upsert)
      },
    },
    async retrieveSubscription(subscriptionId) {
      retrieveCalls.push(subscriptionId)
      const subscription = subscriptionsById[subscriptionId]
      if (!subscription) throw new Error('SUBSCRIPTION_NOT_FOUND')
      return subscription
    },
  }

  return { deps, upserts, retrieveCalls }
}

test('checkout.session.completed récupère l’abonnement complet et l’enregistre', async () => {
  const { deps, upserts, retrieveCalls } = fakeDeps({
    sub_123: fakeSubscription({ status: 'active' }),
  })

  await handleStripeEvent(
    {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: { subscription: 'sub_123', client_reference_id: null } },
    },
    deps
  )

  assert.deepEqual(retrieveCalls, ['sub_123'])
  assert.equal(upserts.length, 1)
  assert.equal(upserts[0].userId, USER_A)
  assert.equal(upserts[0].stripeCustomerId, 'cus_123')
  assert.equal(upserts[0].stripeSubscriptionId, 'sub_123')
  assert.equal(upserts[0].status, 'active')
  assert.equal(upserts[0].priceInterval, 'month')
  assert.equal(upserts[0].currentPeriodEnd, new Date(1_800_000_000 * 1000).toISOString())
})

test('checkout.session.completed sans subscription (défensif) n’écrit rien et ne plante pas', async () => {
  const { deps, upserts, retrieveCalls } = fakeDeps()

  await handleStripeEvent(
    {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: { subscription: null, client_reference_id: null } },
    },
    deps
  )

  assert.equal(upserts.length, 0)
  assert.equal(retrieveCalls.length, 0)
})

test('customer.subscription.updated (past_due) met à jour sans appeler retrieveSubscription', async () => {
  const { deps, upserts, retrieveCalls } = fakeDeps()

  await handleStripeEvent(
    {
      id: 'evt_2',
      type: 'customer.subscription.updated',
      data: { object: fakeSubscription({ status: 'past_due' }) },
    },
    deps
  )

  assert.equal(retrieveCalls.length, 0)
  assert.equal(upserts.length, 1)
  assert.equal(upserts[0].status, 'past_due')
})

test('customer.subscription.deleted enregistre le statut canceled', async () => {
  const { deps, upserts } = fakeDeps()

  await handleStripeEvent(
    {
      id: 'evt_3',
      type: 'customer.subscription.deleted',
      data: { object: fakeSubscription({ status: 'canceled' }) },
    },
    deps
  )

  assert.equal(upserts.length, 1)
  assert.equal(upserts[0].status, 'canceled')
})

test('un même event.id traité deux fois ne déclenche le traitement qu’une seule fois (idempotence)', async () => {
  const { deps, upserts } = fakeDeps()
  const event = {
    id: 'evt_4',
    type: 'customer.subscription.updated',
    data: { object: fakeSubscription({ status: 'active' }) },
  }

  await handleStripeEvent(event, deps)
  await handleStripeEvent(event, deps)

  assert.equal(upserts.length, 1)
})

test('un type d’événement non géré est acquitté sans écriture ni erreur', async () => {
  const { deps, upserts } = fakeDeps()

  await assert.doesNotReject(
    handleStripeEvent({ id: 'evt_5', type: 'invoice.finalized', data: { object: {} } }, deps)
  )
  assert.equal(upserts.length, 0)
})

test('si l’écriture échoue, l’événement n’est PAS marqué traité — un retry Stripe doit pouvoir réessayer', async () => {
  const { deps } = fakeDeps()
  deps.repository.upsertSubscription = async () => {
    throw new Error('DB_UNAVAILABLE')
  }
  const event = {
    id: 'evt_7',
    type: 'customer.subscription.updated',
    data: { object: fakeSubscription({ status: 'active' }) },
  }

  await assert.rejects(handleStripeEvent(event, deps))
  assert.equal(await deps.repository.isEventProcessed('evt_7'), false)
})

test('metadata.supabase_user_id absent et pas de client_reference_id en repli : aucune écriture, pas de crash', async () => {
  const { deps, upserts } = fakeDeps()

  await assert.doesNotReject(
    handleStripeEvent(
      {
        id: 'evt_6',
        type: 'customer.subscription.updated',
        data: { object: fakeSubscription({ metadata: {} }) },
      },
      deps
    )
  )
  assert.equal(upserts.length, 0)
})
