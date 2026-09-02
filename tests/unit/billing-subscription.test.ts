import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getSubscriptionSummaryCore,
  hasActiveProAccessCore,
  type SubscriptionRecord,
  type SubscriptionRepository,
} from '../../src/features/billing/server/subscriptionCore.ts'

const USER_A = '11111111-1111-4111-8111-111111111111'
const USER_B = '22222222-2222-4222-8222-222222222222'

function fakeRepository(records: Map<string, SubscriptionRecord>): SubscriptionRepository {
  return {
    async getSubscription(userId) {
      return records.get(userId) ?? null
    },
  }
}

function record(overrides: Partial<SubscriptionRecord> = {}): SubscriptionRecord {
  return {
    stripeCustomerId: 'cus_123',
    stripeSubscriptionId: 'sub_123',
    status: 'active',
    priceInterval: 'month',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

test('un abonnement actif donne droit à l’accès Pro', async () => {
  const repo = fakeRepository(new Map([[USER_A, record({ status: 'active' })]]))
  assert.equal(await hasActiveProAccessCore(USER_A, repo), true)
})

test('un abonnement en retard de paiement (past_due) conserve l’accès Pro — période de grâce', async () => {
  const repo = fakeRepository(new Map([[USER_A, record({ status: 'past_due' })]]))
  assert.equal(await hasActiveProAccessCore(USER_A, repo), true)
})

test('un abonnement résilié (canceled) ne donne plus accès au plan Pro', async () => {
  const repo = fakeRepository(new Map([[USER_A, record({ status: 'canceled' })]]))
  assert.equal(await hasActiveProAccessCore(USER_A, repo), false)
})

test('un abonnement impayé (unpaid) ne donne plus accès au plan Pro', async () => {
  const repo = fakeRepository(new Map([[USER_A, record({ status: 'unpaid' })]]))
  assert.equal(await hasActiveProAccessCore(USER_A, repo), false)
})

test('un utilisateur sans aucune ligne d’abonnement est traité comme gratuit', async () => {
  const repo = fakeRepository(new Map())
  assert.equal(await hasActiveProAccessCore(USER_A, repo), false)
})

test('isole strictement les abonnements par utilisateur', async () => {
  const repo = fakeRepository(new Map([[USER_A, record({ status: 'active' })]]))
  assert.equal(await hasActiveProAccessCore(USER_B, repo), false)
})

test('getSubscriptionSummaryCore renvoie le plan gratuit sans ligne', async () => {
  const repo = fakeRepository(new Map())
  const summary = await getSubscriptionSummaryCore(USER_A, repo)
  assert.deepEqual(summary, {
    plan: 'free',
    interval: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  })
})

test('getSubscriptionSummaryCore renvoie l’intervalle et la date de renouvellement pour un abonnement Pro actif', async () => {
  const repo = fakeRepository(
    new Map([
      [
        USER_A,
        record({ status: 'active', priceInterval: 'year', currentPeriodEnd: '2027-01-01T00:00:00.000Z' }),
      ],
    ])
  )
  const summary = await getSubscriptionSummaryCore(USER_A, repo)
  assert.deepEqual(summary, {
    plan: 'pro',
    interval: 'year',
    currentPeriodEnd: '2027-01-01T00:00:00.000Z',
    cancelAtPeriodEnd: false,
  })
})

test('getSubscriptionSummaryCore signale une résiliation programmée', async () => {
  const repo = fakeRepository(new Map([[USER_A, record({ status: 'active', cancelAtPeriodEnd: true })]]))
  const summary = await getSubscriptionSummaryCore(USER_A, repo)
  assert.equal(summary.cancelAtPeriodEnd, true)
})

test('getSubscriptionSummaryCore renvoie le plan gratuit pour un abonnement résilié', async () => {
  const repo = fakeRepository(new Map([[USER_A, record({ status: 'canceled' })]]))
  const summary = await getSubscriptionSummaryCore(USER_A, repo)
  assert.equal(summary.plan, 'free')
})
