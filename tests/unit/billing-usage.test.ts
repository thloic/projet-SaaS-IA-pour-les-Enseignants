import assert from 'node:assert/strict'
import test from 'node:test'

import {
  checkAndIncrementUsageCore,
  getUsageCore,
  type UsageCoreDeps,
  type UsageLimits,
} from '../../src/features/billing/server/usageCore.ts'

const USER_A = '11111111-1111-4111-8111-111111111111'
const LIMITS: UsageLimits = { free: 3, pro: 90 }

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

test('un utilisateur Pro sous son plafond est autorisé et le compteur est incrémenté avec la limite Pro', async () => {
  const { deps, state } = fakeDeps(new Set([USER_A]))
  const result = await checkAndIncrementUsageCore(USER_A, 'agent', LIMITS, deps)
  assert.deepEqual(result, { allowed: true, used: 1, limit: LIMITS.pro })
  assert.equal(state.incrementCalls, 1)
})

test('un utilisateur Pro qui a atteint son plafond est refusé', async () => {
  const smallProLimits: UsageLimits = { free: 3, pro: 2 }
  const { deps } = fakeDeps(new Set([USER_A]))
  for (let i = 0; i < smallProLimits.pro; i += 1) {
    await checkAndIncrementUsageCore(USER_A, 'agent', smallProLimits, deps)
  }
  const result = await checkAndIncrementUsageCore(USER_A, 'agent', smallProLimits, deps)
  assert.equal(result.allowed, false)
})

test('un utilisateur gratuit sous la limite est autorisé et le compteur est incrémenté', async () => {
  const { deps, state } = fakeDeps()
  const result = await checkAndIncrementUsageCore(USER_A, 'agent', LIMITS, deps)
  assert.deepEqual(result, { allowed: true, used: 1, limit: LIMITS.free })
  assert.equal(state.incrementCalls, 1)
})

test('un utilisateur gratuit qui a atteint la limite est refusé', async () => {
  const { deps } = fakeDeps()
  for (let i = 0; i < LIMITS.free; i += 1) {
    await checkAndIncrementUsageCore(USER_A, 'agent', LIMITS, deps)
  }
  const result = await checkAndIncrementUsageCore(USER_A, 'agent', LIMITS, deps)
  assert.equal(result.allowed, false)
})

test('getUsageCore renvoie le plafond Pro réel et lit le compteur', async () => {
  const { deps, state } = fakeDeps(new Set([USER_A]))
  await checkAndIncrementUsageCore(USER_A, 'agent', LIMITS, deps)
  const result = await getUsageCore(USER_A, 'agent', LIMITS, deps)
  assert.deepEqual(result, { used: 1, limit: LIMITS.pro })
  assert.equal(state.readCalls, 1)
})

test('getUsageCore renvoie l’usage réel pour un utilisateur gratuit', async () => {
  const { deps } = fakeDeps()
  await checkAndIncrementUsageCore(USER_A, 'agent', LIMITS, deps)
  const result = await getUsageCore(USER_A, 'agent', LIMITS, deps)
  assert.deepEqual(result, { used: 1, limit: LIMITS.free })
})
