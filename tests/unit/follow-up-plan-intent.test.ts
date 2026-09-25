import assert from 'node:assert/strict'
import test from 'node:test'
import { detectFollowUpPlanIntent } from '../../src/features/agent/server/followUpPlanIntent.ts'

test('détecte quelques demandes de plan de suivi explicites', () => {
  assert.deepEqual(detectFollowUpPlanIntent('Génère le plan de suivi de Malo'), {
    kind: 'generate_follow_up_plan',
    studentQuery: 'Malo',
  })
  assert.deepEqual(detectFollowUpPlanIntent("Prépare un plan de suivi pour Naya Dorel."), {
    kind: 'generate_follow_up_plan',
    studentQuery: 'Naya Dorel',
  })
  assert.deepEqual(detectFollowUpPlanIntent('Fais-moi le suivi de Maélis'), {
    kind: 'generate_follow_up_plan',
    studentQuery: 'Maélis',
  })
  assert.deepEqual(detectFollowUpPlanIntent('Generate the follow-up plan for Alex Rivera'), {
    kind: 'generate_follow_up_plan',
    studentQuery: 'Alex Rivera',
  })
  assert.deepEqual(detectFollowUpPlanIntent('Genera el plan de seguimiento de Lucía Torres'), {
    kind: 'generate_follow_up_plan',
    studentQuery: 'Lucía Torres',
  })
})

test('retombe sur le chat normal dès que la formulation ne correspond pas clairement', () => {
  assert.equal(detectFollowUpPlanIntent('Où en est Malo?'), null)
  assert.equal(detectFollowUpPlanIntent('Peux-tu me parler du suivi des élèves?'), null)
  assert.equal(detectFollowUpPlanIntent('Bonjour'), null)
  assert.equal(detectFollowUpPlanIntent('Génère une activité pour Malo'), null)
})

test('ne se confond pas avec une demande de PAT', () => {
  assert.equal(detectFollowUpPlanIntent('Génère le PAT de Malo'), null)
  assert.equal(detectFollowUpPlanIntent("Prépare un plan d'appui pour Naya Dorel."), null)
})
