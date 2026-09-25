import assert from 'node:assert/strict'
import test from 'node:test'

import { looksLikeStudentObservation } from '../../src/features/agent/server/observationIntent.ts'
import { orchestrateStudentObservation } from '../../src/features/agent/server/observationOrchestration.ts'
import type { OwnedStudentRecord } from '../../src/features/agent/types/memory.types.ts'

const STUDENT_ID = '11111111-1111-4111-8111-111111111111'

function student(id = STUDENT_ID, lastName = 'Martin'): OwnedStudentRecord {
  return {
    id,
    firstName: 'Jesse',
    lastName,
    fullName: `Jesse ${lastName}`,
    sex: 'M',
    familyLanguage: 'fr',
    needs: [],
    institutionalAdaptations: [],
    interventionPlan: false,
    generalNotes: '',
    classes: [],
  }
}

test('reconnaît une observation naturelle mais pas une question ordinaire', () => {
  assert.equal(looksLikeStudentObservation('Aujourd’hui Jesse a bien participé à l’oral.'), true)
  assert.equal(looksLikeStudentObservation('Note que Jesse a bien participé à l’oral.'), true)
  assert.equal(looksLikeStudentObservation('Où en est Jesse cette semaine ?'), false)
  assert.equal(looksLikeStudentObservation('Quelle note a Jesse en mathématiques ?'), false)
})

test('enregistre une observation uniquement sur l’élève réellement mentionné', async () => {
  const saved: Array<{ studentId: string; contenu: string }> = []
  const result = await orchestrateStudentObservation(
    { message: 'Note que Jesse a bien participé à l’oral.', interfaceLanguage: 'fr' },
    {
      listOwnedStudents: async () => [student()],
      saveStudentObservation: async (input) => {
        saved.push(input)
        return {
          id: '22222222-2222-4222-8222-222222222222',
          sessionId: null,
          category: 'other',
          tag: 'Observation agent',
          note: input.contenu,
          createdAt: '2026-09-25T10:00:00.000Z',
        }
      },
    }
  )

  assert.equal(result?.kind, 'observation_saved')
  assert.deepEqual(saved, [{ studentId: STUDENT_ID, contenu: 'Jesse a bien participé à l’oral.' }])
})

test('un prénom ambigu demande lequel et n’enregistre rien', async () => {
  let saveCount = 0
  const result = await orchestrateStudentObservation(
    { message: 'Aujourd’hui Jesse a progressé en lecture.', interfaceLanguage: 'fr' },
    {
      listOwnedStudents: async () => [
        student(STUDENT_ID, 'Martin'),
        student('33333333-3333-4333-8333-333333333333', 'Morel'),
      ],
      saveStudentObservation: async () => {
        saveCount += 1
        throw new Error('ne doit pas être appelé')
      },
    }
  )

  assert.equal(result?.kind, 'clarification')
  assert.equal(saveCount, 0)
})
