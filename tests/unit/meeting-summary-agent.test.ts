import assert from 'node:assert/strict'
import test from 'node:test'

import { looksLikeMeetingSummaryRequest } from '../../src/features/agent/server/meetingSummaryIntent.ts'
import {
  resolveMeetingSummaryExtraction,
  type MeetingSummaryExtraction,
} from '../../src/features/agent/schemas/meetingSummaryIntentSchema.ts'
import {
  orchestrateMeetingSummaryRequest,
  MeetingSummaryOrchestrationError,
  type MeetingSummaryRecord,
} from '../../src/features/agent/server/meetingSummaryOrchestration.ts'
import type { StudentContext } from '../../src/features/agent/types/memory.types.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const STUDENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const CLASS_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const LONG_NOTES =
  'Rencontre avec les parents de Naya ce matin. On a discuté de ses difficultés en lecture et convenu de 10 minutes de lecture guidée chaque soir.'

function emptyExtraction(): MeetingSummaryExtraction {
  return { studentQuery: null, notes: null }
}

function fictitiousContext(overrides: Partial<StudentContext> = {}): StudentContext {
  return {
    kind: 'context',
    student: {
      id: STUDENT_ID,
      firstName: 'Naya',
      lastName: 'Dorel',
      fullName: 'Naya Dorel',
      sex: 'F',
      familyLanguage: 'fr',
      needs: [],
      institutionalAdaptations: [],
      interventionPlan: false,
      generalNotes: '',
    },
    classes: [
      {
        id: CLASS_ID,
        name: 'Classe fictive 8A',
        level: '8e année',
        subject: 'Français',
        documentTemplate: null,
        documentTemplatePath: null,
      },
    ],
    observations: [],
    participations: [],
    attendance: [],
    contentVariants: [],
    evaluationResults: [],
    ...overrides,
  }
}

function baseDependencies(overrides: Partial<Parameters<typeof orchestrateMeetingSummaryRequest>[1]> = {}) {
  return {
    extractMeetingSummaryFields: async () => ({
      studentQuery: 'Naya',
      notes: LONG_NOTES,
    }),
    getStudentContext: async () => fictitiousContext(),
    generateMeetingSummary: async () => ({
      subjectsDiscussed: ['Difficultés en lecture'],
      agreementsReached: ['10 minutes de lecture guidée chaque soir'],
      nextSteps: [],
    }),
    saveMeetingSummary: async () => ({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }),
    checkUsage: async () => ({ allowed: true }),
    refundUsage: async () => 0,
    ...overrides,
  }
}

test('looksLikeMeetingSummaryRequest reconnaît les formulations fr/en/es et ignore le reste', () => {
  assert.equal(looksLikeMeetingSummaryRequest('Fais-moi un compte rendu de ma rencontre avec les parents de Naya'), true)
  assert.equal(looksLikeMeetingSummaryRequest('J’ai eu une réunion avec les parents de Naya ce matin'), true)
  assert.equal(looksLikeMeetingSummaryRequest('Summarize my meeting with Naya’s parents'), true)
  assert.equal(looksLikeMeetingSummaryRequest('Resumen de mi reunión con los padres de Naya'), true)
  assert.equal(looksLikeMeetingSummaryRequest('Génère le PAT de Naya'), false)
  assert.equal(looksLikeMeetingSummaryRequest('Bonjour, comment ça va ?'), false)
})

test('resolveMeetingSummaryExtraction exige élève + notes suffisamment longues', () => {
  assert.equal(resolveMeetingSummaryExtraction(emptyExtraction()), null)
  assert.equal(
    resolveMeetingSummaryExtraction({ studentQuery: 'Naya', notes: 'trop court' }),
    null
  )

  const resolved = resolveMeetingSummaryExtraction({ studentQuery: 'Naya', notes: LONG_NOTES })
  assert.deepEqual(resolved, { studentQuery: 'Naya', notes: LONG_NOTES })
})

test('extraction invalide ou incomplète : aucune génération, aucun appel de quota, réponse null', async () => {
  let studentLookups = 0
  let usageCalls = 0
  let generationCalls = 0

  const dependencies = baseDependencies({
    extractMeetingSummaryFields: async () => ({ not: 'a valid extraction shape' }),
    getStudentContext: async () => {
      studentLookups += 1
      return fictitiousContext()
    },
    checkUsage: async () => {
      usageCalls += 1
      return { allowed: true }
    },
    generateMeetingSummary: async () => {
      generationCalls += 1
      return { subjectsDiscussed: ['x'], agreementsReached: [], nextSteps: [] }
    },
  })

  const invalidShapeResult = await orchestrateMeetingSummaryRequest(
    { message: 'peu importe', trustedUserId: USER_ID },
    dependencies
  )
  assert.equal(invalidShapeResult, null)

  const incompleteResult = await orchestrateMeetingSummaryRequest(
    { message: 'Compte rendu de rencontre avec les parents de Naya', trustedUserId: USER_ID },
    { ...dependencies, extractMeetingSummaryFields: async () => ({ studentQuery: 'Naya', notes: 'trop court' }) }
  )
  assert.equal(incompleteResult, null)

  assert.equal(studentLookups, 0)
  assert.equal(usageCalls, 0)
  assert.equal(generationCalls, 0)
})

test('élève ambigu ou introuvable : réponse structurée dédiée, sans génération ni quota', async () => {
  const ambiguous = await orchestrateMeetingSummaryRequest(
    { message: 'Compte rendu de rencontre avec les parents de Naya', trustedUserId: USER_ID },
    baseDependencies({
      getStudentContext: async () => ({
        kind: 'ambiguous',
        candidates: [
          { id: STUDENT_ID, firstName: 'Naya', lastName: 'Dorel', fullName: 'Naya Dorel', classes: [] },
          { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', firstName: 'Naya', lastName: 'Ali', fullName: 'Naya Ali', classes: [] },
        ],
      }),
    })
  )
  assert.equal(ambiguous?.kind, 'clarification')

  const notFound = await orchestrateMeetingSummaryRequest(
    { message: 'Compte rendu de rencontre avec les parents de Inconnu', trustedUserId: USER_ID },
    baseDependencies({ getStudentContext: async () => null })
  )
  assert.equal(notFound?.kind, 'student_not_found')
})

test('génération réussie : enregistrement avec le bon class_id, une seule charge de quota', async () => {
  let usageCalls = 0
  const savedRecords: MeetingSummaryRecord[] = []

  const result = await orchestrateMeetingSummaryRequest(
    { message: 'Compte rendu de rencontre avec les parents de Naya', trustedUserId: USER_ID },
    baseDependencies({
      checkUsage: async () => { usageCalls += 1; return { allowed: true } },
      saveMeetingSummary: async (record) => {
        savedRecords.push(record)
        return { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }
      },
    })
  )

  assert.equal(result?.kind, 'meeting_summary')
  if (result?.kind === 'meeting_summary') {
    assert.equal(result.studentId, STUDENT_ID)
    assert.deepEqual(result.subjectsDiscussed, ['Difficultés en lecture'])
  }
  assert.equal(usageCalls, 1)
  assert.equal(savedRecords[0]?.studentId, STUDENT_ID)
  assert.equal(savedRecords[0]?.classId, CLASS_ID)
  assert.equal(savedRecords[0]?.notes, LONG_NOTES)
})

test('les notes transmises à la génération sont exactement celles extraites, jamais résumées en amont', async () => {
  let receivedNotes: string | undefined

  await orchestrateMeetingSummaryRequest(
    { message: 'Compte rendu de rencontre avec les parents de Naya', trustedUserId: USER_ID },
    baseDependencies({
      generateMeetingSummary: async (input) => {
        receivedNotes = input.notes
        return { subjectsDiscussed: ['x'], agreementsReached: [], nextSteps: [] }
      },
    })
  )

  assert.equal(receivedNotes, LONG_NOTES)
})

test('échec de génération : remboursement exactement une fois, quota déjà débité une fois', async () => {
  let refundCalls = 0
  let usageCalls = 0

  await assert.rejects(
    () =>
      orchestrateMeetingSummaryRequest(
        { message: 'Compte rendu de rencontre avec les parents de Naya', trustedUserId: USER_ID },
        baseDependencies({
          checkUsage: async () => { usageCalls += 1; return { allowed: true } },
          generateMeetingSummary: async () => { throw new Error('échec simulé') },
          refundUsage: async () => { refundCalls += 1 },
        })
      ),
    (error: unknown) =>
      error instanceof MeetingSummaryOrchestrationError && error.code === 'MEETING_SUMMARY_GENERATION_FAILED'
  )

  assert.equal(usageCalls, 1)
  assert.equal(refundCalls, 1)
})

test('quota dépassé : aucune génération tentée', async () => {
  let generationCalls = 0

  await assert.rejects(
    () =>
      orchestrateMeetingSummaryRequest(
        { message: 'Compte rendu de rencontre avec les parents de Naya', trustedUserId: USER_ID },
        baseDependencies({
          checkUsage: async () => ({ allowed: false }),
          generateMeetingSummary: async () => {
            generationCalls += 1
            return { subjectsDiscussed: ['x'], agreementsReached: [], nextSteps: [] }
          },
        })
      ),
    (error: unknown) =>
      error instanceof MeetingSummaryOrchestrationError && error.code === 'MEETING_SUMMARY_QUOTA_EXCEEDED'
  )

  assert.equal(generationCalls, 0)
})
