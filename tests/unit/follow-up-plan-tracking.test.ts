import assert from 'node:assert/strict'
import test from 'node:test'

import { followUpPlanMock } from '../../src/features/agent/mocks/followUpPlanMock.ts'
import {
  adoptFollowUpPlan,
  closeFollowUpPlan,
  FollowUpPlanReviewError,
  isFollowUpPlanReadyForReview,
  summarizeFollowUpPlanProgress,
  updateFollowUpPlanItemStatus,
  type FollowUpPlanRecord,
} from '../../src/features/agent/server/followUpPlanTracking.ts'

const FIRST_SOURCE_ID = 'mock-observation-1'
const SECOND_SOURCE_ID = 'mock-adaptation-1'

function adoptedMock(): FollowUpPlanRecord {
  return adoptFollowUpPlan(followUpPlanMock)
}

test('adoptFollowUpPlan bascule le statut à actif et chaque item à a_suivre', () => {
  const record = adoptedMock()

  assert.equal(record.statut, 'actif')
  assert.equal(record.items.length, 2)
  assert.ok(record.items.every((item) => item.status === 'a_suivre'))
  assert.equal(record.eleve.nom, 'Maélis Roy')
  // les champs métier ne sont pas altérés au passage
  assert.equal(record.items[0]?.objectif, 'Gagner en fluidité sur des textes de son niveau.')
})

test('updateFollowUpPlanItemStatus met à jour un seul item, identifié par sourceId', () => {
  const record = adoptedMock()

  const result = updateFollowUpPlanItemStatus(record, {
    sourceId: FIRST_SOURCE_ID,
    status: 'atteint',
  })

  assert.equal(result.kind, 'updated')
  if (result.kind !== 'updated') return
  const updatedItem = result.record.items.find((item) => item.sourceId === FIRST_SOURCE_ID)
  const otherItem = result.record.items.find((item) => item.sourceId === SECOND_SOURCE_ID)
  assert.equal(updatedItem?.status, 'atteint')
  assert.equal(otherItem?.status, 'a_suivre')
})

test('updateFollowUpPlanItemStatus conserve une revisionNote fournie', () => {
  const record = adoptedMock()

  const result = updateFollowUpPlanItemStatus(record, {
    sourceId: FIRST_SOURCE_ID,
    status: 'non_atteint',
    revisionNote: 'Toujours hésitant sur les mots de plus de 3 syllabes.',
  })

  assert.equal(result.kind, 'updated')
  if (result.kind !== 'updated') return
  const updatedItem = result.record.items.find((item) => item.sourceId === FIRST_SOURCE_ID)
  assert.equal(updatedItem?.status, 'non_atteint')
  assert.equal(updatedItem?.revisionNote, 'Toujours hésitant sur les mots de plus de 3 syllabes.')
})

test('updateFollowUpPlanItemStatus sur un sourceId inconnu ne modifie rien', () => {
  const record = adoptedMock()

  const result = updateFollowUpPlanItemStatus(record, {
    sourceId: 'source-jamais-vue',
    status: 'atteint',
  })

  assert.equal(result.kind, 'item_not_found')
  assert.ok(record.items.every((item) => item.status === 'a_suivre'))
})

test("isFollowUpPlanReadyForReview est faux tant qu'un item reste à_suivre", () => {
  const record = adoptedMock()
  assert.equal(isFollowUpPlanReadyForReview(record), false)

  const partial = updateFollowUpPlanItemStatus(record, { sourceId: FIRST_SOURCE_ID, status: 'atteint' })
  assert.equal(partial.kind, 'updated')
  if (partial.kind !== 'updated') return
  assert.equal(isFollowUpPlanReadyForReview(partial.record), false)
})

test('isFollowUpPlanReadyForReview est vrai quand chaque item a un statut décidé', () => {
  const record = adoptedMock()
  const afterFirst = updateFollowUpPlanItemStatus(record, { sourceId: FIRST_SOURCE_ID, status: 'atteint' })
  assert.equal(afterFirst.kind, 'updated')
  if (afterFirst.kind !== 'updated') return

  const afterSecond = updateFollowUpPlanItemStatus(afterFirst.record, {
    sourceId: SECOND_SOURCE_ID,
    status: 'non_atteint',
  })
  assert.equal(afterSecond.kind, 'updated')
  if (afterSecond.kind !== 'updated') return

  assert.equal(isFollowUpPlanReadyForReview(afterSecond.record), true)
})

test('summarizeFollowUpPlanProgress compte chaque statut correctement', () => {
  const record = adoptedMock()
  const afterFirst = updateFollowUpPlanItemStatus(record, { sourceId: FIRST_SOURCE_ID, status: 'atteint' })
  assert.equal(afterFirst.kind, 'updated')
  if (afterFirst.kind !== 'updated') return

  const summary = summarizeFollowUpPlanProgress(afterFirst.record)
  assert.deepEqual(summary, { atteints: 1, nonAtteints: 0, aSuivre: 1, total: 2 })
})

test('closeFollowUpPlan refuse un plan dont un item est encore à_suivre', () => {
  const record = adoptedMock()
  assert.throws(
    () => closeFollowUpPlan(record, 'Bilan prématuré'),
    (error: unknown) => error instanceof FollowUpPlanReviewError && error.code === 'PLAN_NOT_READY'
  )
})

test('closeFollowUpPlan clôture le plan une fois tous les items évalués', () => {
  const record = adoptedMock()
  const afterFirst = updateFollowUpPlanItemStatus(record, { sourceId: FIRST_SOURCE_ID, status: 'atteint' })
  assert.equal(afterFirst.kind, 'updated')
  if (afterFirst.kind !== 'updated') return
  const afterSecond = updateFollowUpPlanItemStatus(afterFirst.record, {
    sourceId: SECOND_SOURCE_ID,
    status: 'non_atteint',
  })
  assert.equal(afterSecond.kind, 'updated')
  if (afterSecond.kind !== 'updated') return

  const closed = closeFollowUpPlan(afterSecond.record, 'Objectif de lecture non atteint, temps supplémentaire maintenu.')
  assert.equal(closed.statut, 'termine')
  assert.equal(closed.bilan, 'Objectif de lecture non atteint, temps supplémentaire maintenu.')
})
