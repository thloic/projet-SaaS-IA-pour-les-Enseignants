import assert from 'node:assert/strict'
import test from 'node:test'

import {
  checkAndIncrementUsageCore,
  getUsageCore,
  type UsageCoreDeps,
} from '../../src/features/billing/server/usageCore.ts'

const USER_A = '11111111-1111-4111-8111-111111111111'
const LIMIT = 3

function fakeDeps(proUsers: Set<string> = new Set()) {
  const state = { count: 0, incrementCalls: 0, readCalls: 0 }

  const deps: UsageCoreDeps = {
    async hasActiveProAccess(userId) {
      return proUsers.has(userId)
    },
    async incrementCounter(_userId, _feature, limit) {
      state.incrementCalls += 1
      if (state.count >= limit) return -1
      state.count += 1
      return state.count
    },
    async readCounter() {
      state.readCalls += 1
      return state.count
    },
  }

  return { deps, state }
}

test('un utilisateur Pro actif est toujours autorisé, sans jamais incrémenter le compteur gratuit', async () => {
  const { deps, state } = fakeDeps(new Set([USER_A]))
  const result = await checkAndIncrementUsageCore(USER_A, 'agent', LIMIT, deps)
  assert.deepEqual(result, { allowed: true, used: 0, limit: -1 })
  assert.equal(state.incrementCalls, 0)
})

test('un utilisateur gratuit sous la limite est autorisé et le compteur est incrémenté', async () => {
  const { deps, state } = fakeDeps()
  const result = await checkAndIncrementUsageCore(USER_A, 'agent', LIMIT, deps)
  assert.deepEqual(result, { allowed: true, used: 1, limit: LIMIT })
  assert.equal(state.incrementCalls, 1)
})

test('un utilisateur gratuit qui a atteint la limite est refusé', async () => {
  const { deps } = fakeDeps()
  for (let i = 0; i < LIMIT; i += 1) {
    await checkAndIncrementUsageCore(USER_A, 'agent', LIMIT, deps)
  }
  const result = await checkAndIncrementUsageCore(USER_A, 'agent', LIMIT, deps)
  assert.equal(result.allowed, false)
})

test('getUsageCore renvoie une limite illimitée (-1) pour un utilisateur Pro, sans lire le compteur', async () => {
  const { deps, state } = fakeDeps(new Set([USER_A]))
  const result = await getUsageCore(USER_A, 'agent', LIMIT, deps)
  assert.deepEqual(result, { used: 0, limit: -1 })
  assert.equal(state.readCalls, 0)
})

test('getUsageCore renvoie l’usage réel pour un utilisateur gratuit', async () => {
  const { deps } = fakeDeps()
  await checkAndIncrementUsageCore(USER_A, 'agent', LIMIT, deps)
  const result = await getUsageCore(USER_A, 'agent', LIMIT, deps)
  assert.deepEqual(result, { used: 1, limit: LIMIT })
})
