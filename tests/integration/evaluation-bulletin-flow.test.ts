import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluationResultBatchSchema } from '../../src/features/classroom/schemas/classroomSchema.ts'
import { getStudentContextCore, type StudentContextRepository } from '../../src/features/agent/server/studentContextCore.ts'
import { orchestrateBulletinRequest } from '../../src/features/agent/server/bulletinOrchestration.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const STUDENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const CLASS_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function repositoryWithResult(): StudentContextRepository {
  return {
    async listOwnedStudents() {
      return [{
        id: STUDENT_ID,
        firstName: 'Lina',
        lastName: 'Varel',
        fullName: 'Lina Varel',
        sex: 'F',
        familyLanguage: 'fr',
        needs: [],
        institutionalAdaptations: [],
        interventionPlan: false,
        generalNotes: '',
        classes: [{
          id: CLASS_ID,
          name: 'Classe fictive 8C',
          level: '8e année',
          subject: 'Mathématiques',
          documentTemplate: 'Modèle fictif de commentaire scolaire.',
          documentTemplatePath: null,
        }],
      }]
    },
    async listRecentObservations() { return [] },
    async listRecentParticipations() { return [] },
    async listRecentAttendance() { return [] },
    async listRecentContentVariants() { return [] },
    async listRecentEvaluationResults(userId, studentId) {
      assert.equal(userId, USER_ID)
      assert.equal(studentId, STUDENT_ID)
      return [{
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        classId: CLASS_ID,
        title: 'Fractions',
        grade: '17/20',
        createdAt: '2026-03-01T12:00:00.000Z',
      }]
    },
    async studentBelongsToUser() { return true },
    async insertObservation() { throw new Error('Aucune écriture attendue') },
  }
}

test('saisie validée → contexte élève → bulletin ancré sur le résultat enregistré', async () => {
  const input = evaluationResultBatchSchema.parse({
    classId: CLASS_ID,
    title: 'Fractions',
    results: [{ studentId: STUDENT_ID, grade: '17/20' }],
  })
  assert.equal(input.results[0]?.grade, '17/20')

  const context = await getStudentContextCore({ studentQuery: 'Lina' }, USER_ID, repositoryWithResult())
  assert.ok(context && context.kind === 'context')
  assert.equal(context.evaluationResults[0]?.grade, '17/20')

  let groundedGrade = ''
  let quotaCalls = 0
  const response = await orchestrateBulletinRequest(
    { message: 'Rédige le bulletin de Lina en mathématiques, note 17/20', trustedUserId: USER_ID },
    {
      extractBulletinFields: async () => ({ studentQuery: 'Lina', subject: 'Mathématiques', grade: '17/20', observations: null, tone: null }),
      getStudentContext: async () => context,
      fetchTemplatePdfBase64: async () => { throw new Error('Aucun PDF attendu') },
      generateBulletinComment: async ({ evaluationResults }) => {
        groundedGrade = evaluationResults[0]?.grade ?? ''
        return { comment: 'Lina mobilise efficacement ses acquis sur les fractions et poursuit ses progrès avec constance.' }
      },
      saveBulletinComment: async () => {},
      checkUsage: async () => { quotaCalls += 1; return { allowed: true } },
      refundUsage: async () => 0,
    }
  )

  assert.equal(response?.kind, 'bulletin')
  assert.equal(groundedGrade, '17/20')
  assert.equal(quotaCalls, 1)
})
