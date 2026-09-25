import assert from 'node:assert/strict'
import test from 'node:test'

import { adoptFollowUpPlan } from '../../src/features/agent/server/followUpPlanTracking.ts'
import { followUpPlanMock } from '../../src/features/agent/mocks/followUpPlanMock.ts'
import {
  updateFollowUpPlanStatus,
  type FollowUpPlanStatusRepository,
} from '../../src/features/agent/server/followUpPlanStatusService.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222'
const PLAN_ID = '33333333-3333-4333-8333-333333333333'
const FIRST_SOURCE_ID = 'mock-observation-1'

function repositoryWithPlan(): FollowUpPlanStatusRepository {
  const record = adoptFollowUpPlan(followUpPlanMock)
  return {
    async getPlanForUser(userId, planId) {
      // simule le filtrage RLS : rien n'est retourné hors du bon enseignant/plan
      if (userId !== USER_ID || planId !== PLAN_ID) return null
      return record
    },
    async savePlan() {},
  }
}

test('met à jour le statut demandé et persiste le plan résultant', async () => {
  let savedRecord: unknown = null
  const repository: FollowUpPlanStatusRepository = {
    ...repositoryWithPlan(),
    async savePlan(_userId, _planId, record) {
      savedRecord = record
    },
  }

  const result = await updateFollowUpPlanStatus(
    { userId: USER_ID, planId: PLAN_ID, sourceId: FIRST_SOURCE_ID, status: 'atteint' },
    repository
  )

  assert.equal(result.kind, 'updated')
  if (result.kind !== 'updated') return
  const updatedItem = result.record.items.find((item) => item.sourceId === FIRST_SOURCE_ID)
  assert.equal(updatedItem?.status, 'atteint')
  assert.deepEqual(savedRecord, result.record)
})

test("refuse silencieusement un plan qui n'appartient pas à l'enseignant, sans écriture", async () => {
  let saveCalls = 0
  const repository: FollowUpPlanStatusRepository = {
    ...repositoryWithPlan(),
    async savePlan() {
      saveCalls += 1
    },
  }

  const result = await updateFollowUpPlanStatus(
    { userId: OTHER_USER_ID, planId: PLAN_ID, sourceId: FIRST_SOURCE_ID, status: 'atteint' },
    repository
  )

  assert.equal(result.kind, 'plan_not_found')
  assert.equal(saveCalls, 0)
})

test("un sourceId inconnu ne modifie ni ne persiste rien", async () => {
  let saveCalls = 0
  const repository: FollowUpPlanStatusRepository = {
    ...repositoryWithPlan(),
    async savePlan() {
      saveCalls += 1
    },
  }

  const result = await updateFollowUpPlanStatus(
    { userId: USER_ID, planId: PLAN_ID, sourceId: 'source-jamais-vue', status: 'atteint' },
    repository
  )

  assert.equal(result.kind, 'item_not_found')
  assert.equal(saveCalls, 0)
})
