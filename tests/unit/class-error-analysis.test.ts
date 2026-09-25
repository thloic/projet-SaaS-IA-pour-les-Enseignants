import assert from 'node:assert/strict'
import test from 'node:test'
import { buildClassErrorAnalysis, type CorrectionFindingRow } from '../../src/features/agent/server/classContextCore.ts'

const periodRange = { start: '2026-08-11', end: '2026-09-09' }

function row(overrides: Partial<CorrectionFindingRow> = {}): CorrectionFindingRow {
  return {
    status: 'validated',
    validated_at: '2026-09-01T10:00:00.000Z',
    findings: [{ category: 'syntaxe' }],
    ...overrides,
  }
}

test('catégorie la plus fréquente identifiée avec le bon décompte sur des copies validées et récentes', () => {
  const rows = [
    row({ findings: [{ category: 'syntaxe' }, { category: 'methode' }] }),
    row({ findings: [{ category: 'syntaxe' }] }),
    row({ findings: [{ category: 'comprehension' }] }),
  ]
  const result = buildClassErrorAnalysis(rows, periodRange)
  assert.equal(result.status, 'available')
  assert.equal(result.copyCount, 3)
  assert.deepEqual(result.categories, [
    { category: 'syntaxe', count: 2 },
    { category: 'methode', count: 1 },
    { category: 'comprehension', count: 1 },
  ])
})

test('classe sans aucune copie validée : pas assez de données, aucune tendance inventée', () => {
  assert.deepEqual(buildClassErrorAnalysis([], periodRange), { status: 'no_data', copyCount: 0, categories: [] })
})

test('copies non validées (pending/generating/failed) exclues de l’agrégation même dans la fenêtre', () => {
  const rows = [row({ status: 'pending' }), row({ status: 'generating' }), row({ status: 'failed' })]
  assert.deepEqual(buildClassErrorAnalysis(rows, periodRange), { status: 'no_data', copyCount: 0, categories: [] })
})

test('copies validées hors fenêtre par défaut exclues', () => {
  const rows = [row({ validated_at: '2026-07-01T00:00:00.000Z' })]
  assert.deepEqual(buildClassErrorAnalysis(rows, periodRange), { status: 'no_data', copyCount: 0, categories: [] })
})

test('bornes de la fenêtre incluses, copie sans date de validation exclue', () => {
  const rows = [
    row({ validated_at: `${periodRange.start}T00:00:00.000Z` }),
    row({ validated_at: `${periodRange.end}T23:59:00.000Z` }),
    row({ validated_at: null }),
  ]
  const result = buildClassErrorAnalysis(rows, periodRange)
  assert.equal(result.copyCount, 2)
})
