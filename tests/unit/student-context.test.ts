import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getStudentContextCore,
  RECENT_STUDENT_ACTIVITY_LIMIT,
  RECENT_STUDENT_CONTENT_VARIANT_LIMIT,
  saveStudentObservationCore,
  StudentContextError,
  type StudentContextRepository,
} from '../../src/features/agent/server/studentContextCore.ts'
import type {
  OwnedStudentRecord,
  StudentObservationContext,
} from '../../src/features/agent/types/memory.types.ts'

const USER_A = '11111111-1111-4111-8111-111111111111'
const USER_B = '22222222-2222-4222-8222-222222222222'
const JESSE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const JESSICA_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const SOPHIE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

interface FakeRepository extends StudentContextRepository {
  insertedObservations: StudentObservationContext[]
}

function student(
  id: string,
  firstName: string,
  lastName: string,
  className: string,
  institutionalAdaptations: string[] = [
    'Temps supplémentaire',
    'Reformulation des consignes',
  ]
): OwnedStudentRecord {
  return {
    id,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    sex: 'M',
    familyLanguage: 'fr',
    needs: ['Développer les stratégies de planification à l’écrit.'],
    institutionalAdaptations,
    interventionPlan: true,
    generalNotes: 'S’appuie efficacement sur les supports visuels.',
    classes: [
      {
        id: `${id.slice(0, 24)}dddddddddddd`,
        name: className,
        level: '8e année',
        subject: 'Français',
      },
    ],
  }
}

function createFakeRepository(): FakeRepository {
  const studentsByUser = new Map<string, OwnedStudentRecord[]>([
    [
      USER_A,
      [
        student(JESSE_ID, 'Jesse', 'Tetsassi', 'Classe 8A'),
        student(JESSICA_ID, 'Jessica', 'Mensah', 'Classe 8B'),
      ],
    ],
    [
      USER_B,
      [
        student(SOPHIE_ID, 'Sophie', 'Martin', 'Classe 7A', [
          'Accès à un référentiel',
        ]),
      ],
    ],
  ])
  const insertedObservations: StudentObservationContext[] = []

  return {
    insertedObservations,
    async listOwnedStudents(userId) {
      return studentsByUser.get(userId) ?? []
    },
    async listRecentObservations(_userId, studentId, limit) {
      return Array.from({ length: 30 }, (_, index) => ({
        id: `observation-${index}`,
        sessionId: index % 2 === 0 ? null : `session-${index}`,
        category: 'progress' as const,
        tag: 'Progrès visible',
        note: `Observation récente ${index} pour ${studentId}`,
        createdAt: new Date(2026, 0, 30 - index).toISOString(),
      })).slice(0, limit)
    },
    async listRecentParticipations(_userId, _studentId, limit) {
      return Array.from({ length: 30 }, (_, index) => ({
        id: `participation-${index}`,
        sessionId: `session-${index}`,
        value: 1 as const,
        label: 'Participation positive',
        createdAt: new Date(2026, 0, 30 - index).toISOString(),
      })).slice(0, limit)
    },
    async listRecentAttendance(_userId, _studentId, limit) {
      return Array.from({ length: 30 }, (_, index) => ({
        id: `attendance-${index}`,
        sessionId: `session-${index}`,
        status: 'present' as const,
        note: null,
        createdAt: new Date(2026, 0, 30 - index).toISOString(),
        updatedAt: new Date(2026, 0, 30 - index).toISOString(),
      })).slice(0, limit)
    },
    async listRecentContentVariants(_userId, _studentId, limit) {
      return Array.from({ length: 30 }, (_, index) => ({
        id: `content-variant-${index}`,
        adaptationSetId: `set-${index}`,
        title: `Support de cours différencié ${index}`,
        subject: 'Français',
        level: '8e année',
        suggestedVariant: 'support' as const,
        createdAt: new Date(2026, 0, 30 - index).toISOString(),
      })).slice(0, limit)
    },
    async studentBelongsToUser(userId, studentId) {
      return (studentsByUser.get(userId) ?? []).some(({ id }) => id === studentId)
    },
    async insertObservation(userId, studentId, contenu) {
      const observation: StudentObservationContext = {
        id: `saved-${insertedObservations.length + 1}`,
        sessionId: null,
        category: 'other',
        tag: 'Observation agent',
        note: contenu,
        createdAt: new Date(2026, 0, insertedObservations.length + 1).toISOString(),
      }
      if (!(studentsByUser.get(userId) ?? []).some(({ id }) => id === studentId)) {
        throw new Error('Élève inaccessible')
      }
      insertedObservations.push(observation)
      return observation
    },
  }
}

test('getStudentContext agrège le dossier existant avec un historique borné', async () => {
  const repository = createFakeRepository()
  const result = await getStudentContextCore(
    { studentQuery: 'Jesse Tetsassi' },
    USER_A,
    repository
  )

  assert.ok(result && result.kind === 'context')
  assert.equal(result.student.id, JESSE_ID)
  assert.deepEqual(result.student.needs, [
    'Développer les stratégies de planification à l’écrit.',
  ])
  assert.deepEqual(result.student.institutionalAdaptations, [
    'Temps supplémentaire',
    'Reformulation des consignes',
  ])
  assert.equal(result.classes[0]?.name, 'Classe 8A')
  assert.equal(
    result.observations.length + result.participations.length + result.attendance.length,
    RECENT_STUDENT_ACTIVITY_LIMIT
  )
  assert.equal(result.contentVariants.length, RECENT_STUDENT_CONTENT_VARIANT_LIMIT)
  assert.equal(result.contentVariants[0]?.title, 'Support de cours différencié 0')
  assert.equal(
    result.student.institutionalAdaptations.includes('Support de cours différencié 0'),
    false
  )
})

test('getStudentContext renvoie les candidats lorsqu’un nom est ambigu', async () => {
  const result = await getStudentContextCore(
    { studentQuery: 'Jess' },
    USER_A,
    createFakeRepository()
  )

  assert.ok(result && result.kind === 'ambiguous')
  assert.deepEqual(
    result.candidates.map(({ fullName }) => fullName),
    ['Jesse Tetsassi', 'Jessica Mensah']
  )
})

test('getStudentContext renvoie null pour un élève inconnu sans rien créer', async () => {
  const repository = createFakeRepository()
  const result = await getStudentContextCore(
    { studentQuery: 'Élève inconnu' },
    USER_A,
    repository
  )

  assert.equal(result, null)
  assert.equal(repository.insertedObservations.length, 0)
})

test('getStudentContext isole strictement les élèves de chaque enseignant', async () => {
  const repository = createFakeRepository()

  assert.equal(
    await getStudentContextCore({ studentQuery: 'Sophie Martin' }, USER_A, repository),
    null
  )
  assert.equal(
    await getStudentContextCore({ studentQuery: 'Jesse Tetsassi' }, USER_B, repository),
    null
  )

  const ownStudent = await getStudentContextCore(
    { studentQuery: 'Sophie Martin' },
    USER_B,
    repository
  )
  assert.ok(ownStudent && ownStudent.kind === 'context')
  assert.deepEqual(ownStudent.student.institutionalAdaptations, [
    'Accès à un référentiel',
  ])
})

test('saveStudentObservation enrichit uniquement un dossier élève existant', async () => {
  const repository = createFakeRepository()
  const saved = await saveStudentObservationCore(
    {
      studentId: JESSE_ID,
      contenu: 'Jesse mobilise plus spontanément le vocabulaire travaillé à l’oral.',
    },
    USER_A,
    repository
  )

  assert.equal(saved.sessionId, null)
  assert.equal(saved.tag, 'Observation agent')
  assert.equal(repository.insertedObservations.length, 1)

  await assert.rejects(
    () =>
      saveStudentObservationCore(
        { studentId: SOPHIE_ID, contenu: 'Observation interdite.' },
        USER_A,
        repository
      ),
    (error: unknown) =>
      error instanceof StudentContextError && error.code === 'UNAUTHORIZED_STUDENT'
  )
  assert.equal(repository.insertedObservations.length, 1)
})
