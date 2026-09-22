import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCorrectionBatchRecap } from '../../src/features/correction/utils/correctionRecap.ts'
import type { CorrectionCopyStatus, CorrectionFinding } from '../../src/features/correction/types/correction.types.ts'

function copy(status: CorrectionCopyStatus, findings: CorrectionFinding[]) {
  return { status, findings }
}

const finding = (category: CorrectionFinding['category']): CorrectionFinding => ({
  category,
  excerpt: 'x',
  suggestion: 'y',
})

test('compte les copies distinctes concernées par catégorie, pas le nombre brut d’erreurs', () => {
  const copies = [
    copy('validated', [finding('syntaxe'), finding('syntaxe'), finding('methode')]),
    copy('validated', [finding('syntaxe')]),
    copy('validated', [finding('comprehension')]),
  ]
  const recap = buildCorrectionBatchRecap(copies)
  assert.equal(recap.status, 'available')
  assert.equal(recap.validatedCount, 3)
  assert.deepEqual(recap.categories, [
    { category: 'syntaxe', count: 2 },
    { category: 'methode', count: 1 },
    { category: 'comprehension', count: 1 },
  ])
})

test('exclut les copies non validées même si elles ont des erreurs détectées', () => {
  const copies = [
    copy('pending', [finding('syntaxe')]),
    copy('generating', [finding('syntaxe')]),
    copy('complete', [finding('syntaxe')]),
    copy('failed', [finding('syntaxe')]),
  ]
  assert.deepEqual(buildCorrectionBatchRecap(copies), { status: 'no_data', validatedCount: 0, categories: [] })
})

test('aucune copie validée : pas assez de données, aucune catégorie inventée', () => {
  assert.deepEqual(buildCorrectionBatchRecap([]), { status: 'no_data', validatedCount: 0, categories: [] })
})

test('trie les catégories par nombre de copies concernées décroissant', () => {
  const copies = [
    copy('validated', [finding('comprehension')]),
    copy('validated', [finding('methode')]),
    copy('validated', [finding('methode')]),
    copy('validated', [finding('syntaxe')]),
    copy('validated', [finding('syntaxe')]),
    copy('validated', [finding('syntaxe')]),
  ]
  const recap = buildCorrectionBatchRecap(copies)
  assert.deepEqual(
    recap.categories.map((item) => item.category),
    ['syntaxe', 'methode', 'comprehension']
  )
})

test('une copie validée sans erreur détectée ne compte dans aucune catégorie', () => {
  const copies = [copy('validated', [])]
  const recap = buildCorrectionBatchRecap(copies)
  assert.equal(recap.status, 'available')
  assert.equal(recap.validatedCount, 1)
  assert.deepEqual(recap.categories, [])
})
