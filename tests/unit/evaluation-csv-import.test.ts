import assert from 'node:assert/strict'
import test from 'node:test'

import { parseEvaluationCsv } from '../../src/features/classroom/server/evaluationCsvParsing.ts'
import type { StudentProfile } from '../../src/features/classroom/types/classroom.types.ts'

function student(id: string, first: string, last: string): StudentProfile {
  return {
    id,
    user_id: 'user-1',
    first_name: first,
    last_name: last,
    sex: 'M',
    needs: [],
    institutional_adaptations: [],
    language: 'fr',
    family_language: 'fr',
    intervention_plan: false,
    general_notes: '',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

const LOIC = student('11111111-1111-4111-8111-111111111111', 'Loïc', 'Martin')
const SARA = student('22222222-2222-4222-8222-222222222222', 'Sara', 'Nadeau')
const EMMA_A = student('33333333-3333-4333-8333-333333333333', 'Emma', 'Arseneau')
const EMMA_B = student('44444444-4444-4444-8444-444444444444', 'Emma', 'Bouchard')

test('rejette un en-tête différent du format imposé', () => {
  const result = parseEvaluationCsv('Élève,Grade\nLoïc Martin,16/20', [LOIC])
  assert.equal(result.headerValid, false)
})

test('accepte l’en-tête attendu quelle que soit la casse', () => {
  const result = parseEvaluationCsv('nom complet,NOTE\nLoïc Martin,16/20', [LOIC])
  assert.equal(result.headerValid, true)
})

test('associe chaque ligne au bon élève par nom, insensible aux accents et à la casse', () => {
  const result = parseEvaluationCsv(
    'Nom complet,Note\nloic martin,16/20\nSARA NADEAU,14/20',
    [LOIC, SARA]
  )
  assert.equal(result.rows.length, 2)
  assert.deepEqual(
    result.rows.map((row) => row.studentId).sort(),
    [LOIC.id, SARA.id].sort()
  )
})

test('ignore et rapporte une ligne sans note, sans bloquer les autres', () => {
  const result = parseEvaluationCsv(
    'Nom complet,Note\nLoïc Martin,\nSara Nadeau,14/20',
    [LOIC, SARA]
  )
  assert.equal(result.rows.length, 1)
  assert.equal(result.rows[0]?.studentId, SARA.id)
  assert.equal(result.skipped.length, 1)
  assert.match(result.skipped[0]!.reason, /Note vide/)
})

test('ignore et rapporte une ligne dont le nom ne correspond à aucun élève de la classe', () => {
  const result = parseEvaluationCsv('Nom complet,Note\nInconnu Personne,16/20', [LOIC])
  assert.equal(result.rows.length, 0)
  assert.equal(result.skipped.length, 1)
  assert.match(result.skipped[0]!.reason, /Aucun élève/)
})

test('ignore et rapporte une ligne dont le nom complet correspond à plusieurs élèves (homonymes)', () => {
  const homonym = student(EMMA_B.id, 'Emma', 'Arseneau')
  const result = parseEvaluationCsv('Nom complet,Note\nEmma Arseneau,16/20', [EMMA_A, homonym])
  assert.equal(result.rows.length, 0)
  assert.equal(result.skipped.length, 1)
  assert.match(result.skipped[0]!.reason, /Plusieurs élèves/)
})

test('un prénom seul, sans nom de famille, ne correspond à aucun élève (le modèle attend le nom complet)', () => {
  const result = parseEvaluationCsv('Nom complet,Note\nEmma,16/20', [EMMA_A, EMMA_B])
  assert.equal(result.rows.length, 0)
  assert.match(result.skipped[0]!.reason, /Aucun élève/)
})

test('un fichier partiellement valide enregistre quand même les lignes exploitables', () => {
  const result = parseEvaluationCsv(
    'Nom complet,Note\nLoïc Martin,16/20\nInconnu,10/20\nSara Nadeau,',
    [LOIC, SARA]
  )
  assert.equal(result.rows.length, 1)
  assert.equal(result.rows[0]?.studentId, LOIC.id)
  assert.equal(result.skipped.length, 2)
})
