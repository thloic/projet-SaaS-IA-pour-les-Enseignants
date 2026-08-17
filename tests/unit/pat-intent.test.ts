import assert from 'node:assert/strict'
import test from 'node:test'

import { detectPATIntent } from '../../src/features/agent/server/patIntent.ts'

test('détecte quelques demandes PAT explicites de la V1', () => {
  assert.deepEqual(detectPATIntent('Génère le PAT de Malo'), {
    kind: 'generate_pat',
    studentQuery: 'Malo',
  })
  assert.deepEqual(detectPATIntent("Prépare un plan d'appui pour Naya Dorel."), {
    kind: 'generate_pat',
    studentQuery: 'Naya Dorel',
  })
  assert.deepEqual(detectPATIntent('Fais-moi le PAT de Maélis'), {
    kind: 'generate_pat',
    studentQuery: 'Maélis',
  })
  assert.deepEqual(detectPATIntent('Generate the support plan for Alex Rivera'), {
    kind: 'generate_pat',
    studentQuery: 'Alex Rivera',
  })
  assert.deepEqual(detectPATIntent('Genera el PAT de Lucía Torres'), {
    kind: 'generate_pat',
    studentQuery: 'Lucía Torres',
  })
})

test('retombe sur le chat normal dès que la formulation ne correspond pas clairement', () => {
  assert.equal(detectPATIntent('Où en est Malo?'), null)
  assert.equal(detectPATIntent('Peux-tu me parler des plans d’appui?'), null)
  assert.equal(detectPATIntent('Bonjour'), null)
  assert.equal(detectPATIntent('Génère une activité pour Malo'), null)
})
