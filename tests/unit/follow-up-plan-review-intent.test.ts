import assert from 'node:assert/strict'
import test from 'node:test'

import { detectFollowUpPlanReviewIntent } from '../../src/features/agent/server/followUpPlanReviewIntent.ts'

test('détecte la demande de bilan de révision en fr/en/es et isole le nom de l’élève', () => {
  assert.deepEqual(
    detectFollowUpPlanReviewIntent('Prépare le bilan de révision du plan de suivi de Maélis Roy'),
    { kind: 'generate_follow_up_plan_review', studentQuery: 'Maélis Roy' }
  )
  assert.deepEqual(
    detectFollowUpPlanReviewIntent('Prepare the follow-up plan review for Maélis Roy'),
    { kind: 'generate_follow_up_plan_review', studentQuery: 'Maélis Roy' }
  )
  assert.deepEqual(
    detectFollowUpPlanReviewIntent('Prepara el balance de revisión del plan de seguimiento de Maélis Roy'),
    { kind: 'generate_follow_up_plan_review', studentQuery: 'Maélis Roy' }
  )
})

test('ne se déclenche pas sur une simple demande de brouillon de plan de suivi', () => {
  assert.equal(detectFollowUpPlanReviewIntent('Génère le plan de suivi de Maélis Roy'), null)
  assert.equal(detectFollowUpPlanReviewIntent('Generate the follow-up plan for Maélis Roy'), null)
})

test('ignore une phrase hors sujet', () => {
  assert.equal(detectFollowUpPlanReviewIntent('Bonjour, comment ça va ?'), null)
})
