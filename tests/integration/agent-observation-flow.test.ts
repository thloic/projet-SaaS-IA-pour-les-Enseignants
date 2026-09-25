import assert from 'node:assert/strict'
import test from 'node:test'

import { orchestrateStudentObservation } from '../../src/features/agent/server/observationOrchestration.ts'
import { getStudentContextCore, saveStudentObservationCore } from '../../src/features/agent/server/studentContextCore.ts'
import type { StudentContextRepository } from '../../src/features/agent/server/studentContextCore.ts'
import type { OwnedStudentRecord, StudentObservationContext } from '../../src/features/agent/types/memory.types.ts'

const USER_ID = 'teacher-a'
const STUDENT_ID = '11111111-1111-4111-8111-111111111111'

const ownedStudent: OwnedStudentRecord = {
  id: STUDENT_ID,
  firstName: 'Jesse',
  lastName: 'Martin',
  fullName: 'Jesse Martin',
  sex: 'M',
  familyLanguage: 'fr',
  needs: [],
  institutionalAdaptations: [],
  interventionPlan: false,
  generalNotes: '',
  classes: [{ id: 'class-a', name: '8A', level: '8e', subject: 'Français', documentTemplate: null, documentTemplatePath: null }],
}

test('phrase naturelle → sauvegarde sécurisée → observation disponible dans le contexte suivant', async () => {
  const observations: StudentObservationContext[] = []
  const repository: StudentContextRepository = {
    listOwnedStudents: async (userId) => userId === USER_ID ? [ownedStudent] : [],
    listRecentObservations: async () => observations,
    listRecentParticipations: async () => [],
    listRecentAttendance: async () => [],
    listRecentContentVariants: async () => [],
    listRecentEvaluationResults: async () => [],
    studentBelongsToUser: async (userId, studentId) => userId === USER_ID && studentId === STUDENT_ID,
    insertObservation: async (_userId, studentId, contenu) => {
      const observation: StudentObservationContext = {
        id: '22222222-2222-4222-8222-222222222222',
        sessionId: null,
        category: 'other',
        tag: 'Observation agent',
        note: contenu,
        createdAt: '2026-09-25T10:00:00.000Z',
      }
      assert.equal(studentId, STUDENT_ID)
      observations.push(observation)
      return observation
    },
  }

  const response = await orchestrateStudentObservation(
    { message: 'Aujourd’hui Jesse a participé avec assurance à l’oral.', interfaceLanguage: 'fr' },
    {
      listOwnedStudents: () => repository.listOwnedStudents(USER_ID),
      saveStudentObservation: (input) => saveStudentObservationCore(input, USER_ID, repository),
    }
  )
  assert.equal(response?.kind, 'observation_saved')

  const context = await getStudentContextCore(
    { studentQuery: 'Jesse Martin' },
    USER_ID,
    repository
  )
  assert.ok(context && context.kind === 'context')
  if (context && context.kind === 'context') {
    assert.equal(context.observations[0]?.note, 'Aujourd’hui Jesse a participé avec assurance à l’oral.')
  }
})
