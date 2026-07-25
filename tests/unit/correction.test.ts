import assert from 'node:assert/strict'
import test from 'node:test'

import {
  correctionCopyInputSchema,
  createCorrectionBatchSchema,
  generatedCorrectionSchema,
  launchCorrectionBatchSchema,
} from '../../src/features/correction/schemas/correctionSchema.ts'
import { filterNonEmptyCopies } from '../../src/features/correction/utils/prepareBatchCopies.ts'
import { buildCorrectionPrompt } from '../../src/lib/prompts/correction.ts'

const VALID_UUID = '11111111-1111-4111-8111-111111111111'
const VALID_UUID_2 = '22222222-2222-4222-8222-222222222222'

test('correctionCopyInputSchema accepts a valid copy and rejects an empty text', () => {
  assert.equal(
    correctionCopyInputSchema.safeParse({ studentId: VALID_UUID, contentText: 'Une copie valide.' })
      .success,
    true
  )
  assert.equal(
    correctionCopyInputSchema.safeParse({ studentId: VALID_UUID, contentText: '' }).success,
    false
  )
  assert.equal(
    correctionCopyInputSchema.safeParse({ studentId: 'not-a-uuid', contentText: 'texte' }).success,
    false
  )
})

test('createCorrectionBatchSchema requires a class and at least one copy', () => {
  assert.equal(
    createCorrectionBatchSchema.safeParse({
      classId: VALID_UUID,
      copies: [{ studentId: VALID_UUID_2, contentText: 'Une copie.' }],
    }).success,
    true
  )
  assert.equal(
    createCorrectionBatchSchema.safeParse({ classId: VALID_UUID, copies: [] }).success,
    false
  )
  assert.equal(
    createCorrectionBatchSchema.safeParse({
      classId: 'not-a-uuid',
      copies: [{ studentId: VALID_UUID_2, contentText: 'Une copie.' }],
    }).success,
    false
  )
})

test('filterNonEmptyCopies drops empty and whitespace-only copies', () => {
  const result = filterNonEmptyCopies([
    { studentId: VALID_UUID, contentText: 'Une copie valide.' },
    { studentId: VALID_UUID_2, contentText: '' },
    { studentId: 'third-student', contentText: '   ' },
  ])

  assert.equal(result.length, 1)
  assert.equal(result[0]?.studentId, VALID_UUID)
})

test('filterNonEmptyCopies trims surrounding whitespace but keeps internal content', () => {
  const result = filterNonEmptyCopies([
    { studentId: VALID_UUID, contentText: '  Une copie avec espaces autour.  ' },
  ])

  assert.equal(result.length, 1)
  assert.equal(result[0]?.contentText, 'Une copie avec espaces autour.')
})

test('filterNonEmptyCopies returns an empty array when given no copies', () => {
  assert.deepEqual(filterNonEmptyCopies([]), [])
})

test('launchCorrectionBatchSchema accepts the three correction tones and rejects others', () => {
  for (const tone of ['encourageant', 'factuel', 'direct']) {
    assert.equal(
      launchCorrectionBatchSchema.safeParse({ batchId: VALID_UUID, tone }).success,
      true
    )
  }
  assert.equal(
    launchCorrectionBatchSchema.safeParse({ batchId: VALID_UUID, tone: 'bienveillant' }).success,
    false
  )
})

test('generatedCorrectionSchema requires classified findings and a comment of reasonable length', () => {
  assert.equal(
    generatedCorrectionSchema.safeParse({
      findings: [{ category: 'syntaxe', excerpt: 'il ont', suggestion: 'ils ont' }],
      comment: 'Un commentaire suffisamment long pour être valide selon le schéma.',
    }).success,
    true
  )
  assert.equal(
    generatedCorrectionSchema.safeParse({
      findings: [{ category: 'invalide', excerpt: 'x', suggestion: 'y' }],
      comment: 'Un commentaire suffisamment long pour être valide selon le schéma.',
    }).success,
    false
  )
  assert.equal(
    generatedCorrectionSchema.safeParse({ findings: [], comment: 'trop court' }).success,
    false
  )
})

test('buildCorrectionPrompt embeds the fixed error taxonomy and the chosen tone', () => {
  const prompt = buildCorrectionPrompt({
    contentText: 'Il ont regardé le film hier soir.',
    tone: 'direct',
    teacherProfile: { level: 'Secondaire 2', language: 'fr' },
  })

  assert.match(prompt.systemPrompt, /syntaxe/)
  assert.match(prompt.systemPrompt, /comprehension/)
  assert.match(prompt.systemPrompt, /methode/)
  assert.match(prompt.systemPrompt, /aucune formulation négative/i)
  assert.match(prompt.userPrompt, /Ton direct/)
  assert.match(prompt.userPrompt, /Il ont regardé le film hier soir\./)
})
