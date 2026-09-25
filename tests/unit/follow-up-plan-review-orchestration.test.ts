import assert from 'node:assert/strict'
import test from 'node:test'

import { followUpPlanMock } from '../../src/features/agent/mocks/followUpPlanMock.ts'
import {
  adoptFollowUpPlan,
  updateFollowUpPlanItemStatus,
  type FollowUpPlanRecord,
} from '../../src/features/agent/server/followUpPlanTracking.ts'
import {
  FollowUpPlanReviewOrchestrationError,
  orchestrateFollowUpPlanReviewRequest,
} from '../../src/features/agent/server/followUpPlanReviewOrchestration.ts'
import type { StudentContext } from '../../src/features/agent/types/memory.types.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const STUDENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function fictitiousContext(): StudentContext {
  return {
    kind: 'context',
    student: {
      id: STUDENT_ID,
      firstName: 'Maélis',
      lastName: 'Roy',
      fullName: 'Maélis Roy',
      sex: 'F',
      familyLanguage: 'fr',
      needs: [],
      institutionalAdaptations: ['Temps supplémentaire'],
      interventionPlan: false,
      generalNotes: '',
    },
    classes: [],
    observations: [],
    participations: [],
    attendance: [],
    contentVariants: [],
    evaluationResults: [],
  }
}

function readyPlan(): FollowUpPlanRecord {
  const adopted = adoptFollowUpPlan(followUpPlanMock)
  const afterFirst = updateFollowUpPlanItemStatus(adopted, { sourceId: 'mock-observation-1', status: 'atteint' })
  if (afterFirst.kind !== 'updated') throw new Error('fixture invalide')
  const afterSecond = updateFollowUpPlanItemStatus(afterFirst.record, {
    sourceId: 'mock-adaptation-1',
    status: 'non_atteint',
  })
  if (afterSecond.kind !== 'updated') throw new Error('fixture invalide')
  return afterSecond.record
}

function notReadyPlan(): FollowUpPlanRecord {
  return adoptFollowUpPlan(followUpPlanMock)
}

function baseDependencies(overrides: Partial<Parameters<typeof orchestrateFollowUpPlanReviewRequest>[1]> = {}) {
  return {
    getStudentContext: async () => fictitiousContext(),
    getActiveFollowUpPlan: async () => readyPlan(),
    generateFollowUpPlanReview: async () => ({
      bilan: 'Objectif de lecture atteint, le temps supplémentaire reste nécessaire pour les évaluations.',
    }),
    savePlan: async () => {},
    checkUsage: async () => ({ allowed: true }),
    refundUsage: async () => 0,
    ...overrides,
  }
}

test('élève sans plan de suivi actif : réponse explicite, aucune génération ni quota', async () => {
  let generationCalls = 0
  let usageCalls = 0

  const response = await orchestrateFollowUpPlanReviewRequest(
    { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
    baseDependencies({
      getActiveFollowUpPlan: async () => null,
      generateFollowUpPlanReview: async () => {
        generationCalls += 1
        return { bilan: 'x' }
      },
      checkUsage: async () => {
        usageCalls += 1
        return { allowed: true }
      },
    })
  )

  assert.equal(response.kind, 'student_data_missing')
  assert.equal(generationCalls, 0)
  assert.equal(usageCalls, 0)
})

test('plan actif mais objectifs pas tous statués : blocage explicite, aucune génération ni quota', async () => {
  let generationCalls = 0
  let usageCalls = 0

  const response = await orchestrateFollowUpPlanReviewRequest(
    { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
    baseDependencies({
      getActiveFollowUpPlan: async () => notReadyPlan(),
      generateFollowUpPlanReview: async () => {
        generationCalls += 1
        return { bilan: 'x' }
      },
      checkUsage: async () => {
        usageCalls += 1
        return { allowed: true }
      },
    })
  )

  assert.equal(response.kind, 'follow_up_plan_review_not_ready')
  assert.equal(generationCalls, 0)
  assert.equal(usageCalls, 0)
})

test('plan entièrement évalué : génération, quota débité une fois, plan clôturé et persisté', async () => {
  let usageCalls = 0
  const savedPlans: FollowUpPlanRecord[] = []

  const response = await orchestrateFollowUpPlanReviewRequest(
    { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
    baseDependencies({
      checkUsage: async () => {
        usageCalls += 1
        return { allowed: true }
      },
      savePlan: async (record: FollowUpPlanRecord) => {
        savedPlans.push(record)
      },
    })
  )

  assert.equal(response.kind, 'follow_up_plan_review')
  assert.equal(usageCalls, 1)
  assert.equal(savedPlans.length, 1)
  assert.equal(savedPlans[0]?.statut, 'termine')
  assert.match(savedPlans[0]?.bilan ?? '', /temps supplémentaire/)
})

test('élève ambigu ou introuvable : réponse structurée dédiée, sans génération ni quota', async () => {
  const ambiguous = await orchestrateFollowUpPlanReviewRequest(
    { studentQuery: 'Maélis', trustedUserId: USER_ID },
    baseDependencies({
      getStudentContext: async () => ({
        kind: 'ambiguous',
        candidates: [
          { id: STUDENT_ID, firstName: 'Maélis', lastName: 'Roy', fullName: 'Maélis Roy', classes: [] },
          { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', firstName: 'Maélis', lastName: 'Bond', fullName: 'Maélis Bond', classes: [] },
        ],
      }),
    })
  )
  assert.equal(ambiguous.kind, 'clarification')

  const notFound = await orchestrateFollowUpPlanReviewRequest(
    { studentQuery: 'Inconnu', trustedUserId: USER_ID },
    baseDependencies({ getStudentContext: async () => null })
  )
  assert.equal(notFound.kind, 'student_not_found')
})

test('échec de génération : remboursement exactement une fois, plan non persisté', async () => {
  let refundCalls = 0
  let saveCalls = 0

  await assert.rejects(
    () =>
      orchestrateFollowUpPlanReviewRequest(
        { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
        baseDependencies({
          generateFollowUpPlanReview: async () => {
            throw new Error('échec simulé')
          },
          refundUsage: async () => {
            refundCalls += 1
          },
          savePlan: async () => {
            saveCalls += 1
          },
        })
      ),
    (error: unknown) =>
      error instanceof FollowUpPlanReviewOrchestrationError && error.code === 'FOLLOW_UP_PLAN_REVIEW_GENERATION_FAILED'
  )

  assert.equal(refundCalls, 1)
  assert.equal(saveCalls, 0)
})

test('quota dépassé : aucune génération tentée', async () => {
  let generationCalls = 0

  await assert.rejects(
    () =>
      orchestrateFollowUpPlanReviewRequest(
        { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
        baseDependencies({
          checkUsage: async () => ({ allowed: false }),
          generateFollowUpPlanReview: async () => {
            generationCalls += 1
            return { bilan: 'x' }
          },
        })
      ),
    (error: unknown) =>
      error instanceof FollowUpPlanReviewOrchestrationError && error.code === 'FOLLOW_UP_PLAN_REVIEW_QUOTA_EXCEEDED'
  )

  assert.equal(generationCalls, 0)
})
