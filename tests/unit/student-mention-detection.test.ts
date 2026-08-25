import assert from 'node:assert/strict'
import test from 'node:test'

import { detectMentionedStudent } from '../../src/features/agent/server/studentMentionDetection.ts'
import type { OwnedStudentRecord } from '../../src/features/agent/types/memory.types.ts'

function student(id: string, firstName: string, lastName: string): OwnedStudentRecord {
  return {
    id,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    sex: 'M',
    familyLanguage: 'fr',
    needs: [],
    institutionalAdaptations: [],
    interventionPlan: false,
    generalNotes: '',
    classes: [],
  }
}

const LOIC = student('11111111-1111-4111-8111-111111111111', 'Loïc', 'Martin')
const SARA = student('22222222-2222-4222-8222-222222222222', 'Sara', 'Nadeau')
const EMMA_A = student('33333333-3333-4333-8333-333333333333', 'Emma', 'Arseneau')
const EMMA_B = student('44444444-4444-4444-8444-444444444444', 'Emma', 'Bouchard')

test('reconnaît un nom exact (avec accent) au milieu d’une phrase libre', () => {
  const result = detectMentionedStudent('Comment va Loïc ce mois-ci ?', [LOIC, SARA])
  assert.equal(result.kind, 'match')
  if (result.kind === 'match') assert.equal(result.student.id, LOIC.id)
})

test('reconnaît un nom même sans accent ni casse', () => {
  const result = detectMentionedStudent('comment va loic aujourdhui', [LOIC, SARA])
  assert.equal(result.kind, 'match')
  if (result.kind === 'match') assert.equal(result.student.id, LOIC.id)
})

test('ne trouve rien quand aucun élève réel n’est mentionné', () => {
  assert.deepEqual(detectMentionedStudent('Quel temps fait-il aujourd’hui ?', [LOIC, SARA]), {
    kind: 'none',
  })
})

test('ne retient que le premier élève mentionné quand plusieurs sont cités', () => {
  const result = detectMentionedStudent('Compare Loïc et Sara sur leur participation.', [SARA, LOIC])
  assert.equal(result.kind, 'match')
  if (result.kind === 'match') assert.equal(result.student.id, LOIC.id)
})

test('signale une ambiguïté quand plusieurs élèves partagent le même prénom mentionné', () => {
  const result = detectMentionedStudent('Comment va Emma en ce moment ?', [EMMA_A, EMMA_B])
  assert.equal(result.kind, 'ambiguous')
  if (result.kind === 'ambiguous') {
    assert.deepEqual(
      result.candidates.map((candidate) => candidate.id).sort(),
      [EMMA_A.id, EMMA_B.id].sort()
    )
  }
})

test('un prénom ambigu mentionné après un élève sans ambiguïté ne perturbe pas la détection', () => {
  const result = detectMentionedStudent('Loïc a bien participé, comme Emma d’ailleurs.', [
    LOIC,
    EMMA_A,
    EMMA_B,
  ])
  assert.equal(result.kind, 'match')
  if (result.kind === 'match') assert.equal(result.student.id, LOIC.id)
})
