import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertExamVariantConsistency,
  examVariantSetSchema,
  ExamVariantConsistencyError,
} from '../../src/features/adaptation/schemas/examVariantSchema.ts'
import { buildExamVariantPrompt } from '../../src/lib/prompts/examVariant.ts'
import {
  generateExamVariantSet,
  parseExamVariantSet,
} from '../../src/features/adaptation/server/examVariantGeneration.service.ts'

function consistentSet() {
  return examVariantSetSchema.parse({
    variants: [
      {
        label: 'A',
        title: 'Examen — Version A',
        questions: [
          { prompt: 'Résous 12 + 8.', points: 5 },
          { prompt: 'Explique la méthode utilisée.', points: 10 },
        ],
      },
      {
        label: 'B',
        title: 'Examen — Version B',
        questions: [
          { prompt: 'Résous 15 + 9.', points: 5 },
          { prompt: 'Justifie ta démarche.', points: 10 },
        ],
      },
      {
        label: 'C',
        title: 'Examen — Version C',
        questions: [
          { prompt: 'Résous 20 + 7.', points: 5 },
          { prompt: 'Décris les étapes suivies.', points: 10 },
        ],
      },
    ],
  })
}

test('assertExamVariantConsistency accepte un jeu de 3 variantes structurellement équivalentes', () => {
  assert.doesNotThrow(() => assertExamVariantConsistency(consistentSet()))
})

test('assertExamVariantConsistency rejette un nombre de questions différent entre variantes', () => {
  const set = consistentSet()
  set.variants[1]!.questions.pop()
  assert.throws(
    () => assertExamVariantConsistency(set),
    (error: unknown) =>
      error instanceof ExamVariantConsistencyError && error.code === 'QUESTION_COUNT_MISMATCH'
  )
})

test('assertExamVariantConsistency rejette un barème différent pour la même question', () => {
  const set = consistentSet()
  set.variants[2]!.questions[0]!.points = 8
  assert.throws(
    () => assertExamVariantConsistency(set),
    (error: unknown) => error instanceof ExamVariantConsistencyError && error.code === 'POINTS_MISMATCH'
  )
})

test('assertExamVariantConsistency rejette une question identique reprise entre deux variantes', () => {
  const set = consistentSet()
  set.variants[1]!.questions[0]!.prompt = set.variants[0]!.questions[0]!.prompt
  assert.throws(
    () => assertExamVariantConsistency(set),
    (error: unknown) => error instanceof ExamVariantConsistencyError && error.code === 'DUPLICATE_QUESTION'
  )
})

test('assertExamVariantConsistency rejette une étiquette de variante dupliquée', () => {
  const set = consistentSet()
  set.variants[1]!.label = 'A'
  assert.throws(
    () => assertExamVariantConsistency(set),
    (error: unknown) => error instanceof ExamVariantConsistencyError && error.code === 'DUPLICATE_LABEL'
  )
})

test('buildExamVariantPrompt intègre le contenu source et exige les 3 versions A/B/C', () => {
  const prompt = buildExamVariantPrompt({
    sourceContent: 'Examen de mathématiques sur les fractions.',
    sourceTitle: 'Contrôle fractions',
    subject: 'Mathématiques',
    level: '6e année',
    language: 'fr',
  })
  assert.match(prompt.userPrompt, /Examen de mathématiques sur les fractions\./)
  assert.match(prompt.systemPrompt, /A, B, C/)
  assert.match(prompt.systemPrompt, /même barème/i)
})

test('parseExamVariantSet rejette une sortie JSON structurellement incohérente', () => {
  const inconsistent = consistentSet()
  inconsistent.variants[1]!.questions.pop()
  assert.throws(
    () => parseExamVariantSet(JSON.stringify(inconsistent)),
    (error: unknown) =>
      error instanceof ExamVariantConsistencyError && error.code === 'QUESTION_COUNT_MISMATCH'
  )
})

test('parseExamVariantSet rejette un JSON invalide', () => {
  assert.throws(() => parseExamVariantSet('{"variants":'))
})

test('parseExamVariantSet accepte une sortie JSON cohérente, y compris avec des blocs de code markdown', () => {
  const wrapped = ['```json', JSON.stringify(consistentSet()), '```'].join('\n')
  const result = parseExamVariantSet(wrapped)
  assert.equal(result.variants.length, 3)
})

test('la chaîne mock de génération produit un jeu cohérent sans appel réseau', async () => {
  const previousMode = process.env.EXAM_VARIANT_GENERATION_MODE
  process.env.EXAM_VARIANT_GENERATION_MODE = 'mock'

  try {
    const result = await generateExamVariantSet({
      sourceContent: 'Examen de mathématiques sur les fractions.',
      sourceTitle: 'Contrôle fractions',
      subject: 'Mathématiques',
      level: '6e année',
      language: 'fr',
    })
    assert.equal(result.variants.length, 3)
    assert.deepEqual(result.variants.map((variant) => variant.label), ['A', 'B', 'C'])
    assert.doesNotThrow(() => assertExamVariantConsistency(result))
  } finally {
    if (previousMode === undefined) delete process.env.EXAM_VARIANT_GENERATION_MODE
    else process.env.EXAM_VARIANT_GENERATION_MODE = previousMode
  }
})

test('un mode de génération forcé en échec ne produit aucun jeu de variantes', async () => {
  const previousMode = process.env.EXAM_VARIANT_GENERATION_MODE
  process.env.EXAM_VARIANT_GENERATION_MODE = 'fail'

  try {
    await assert.rejects(() =>
      generateExamVariantSet({
        sourceContent: 'Examen de mathématiques sur les fractions.',
        sourceTitle: 'Contrôle fractions',
        subject: 'Mathématiques',
        level: '6e année',
        language: 'fr',
      })
    )
  } finally {
    if (previousMode === undefined) delete process.env.EXAM_VARIANT_GENERATION_MODE
    else process.env.EXAM_VARIANT_GENERATION_MODE = previousMode
  }
})
