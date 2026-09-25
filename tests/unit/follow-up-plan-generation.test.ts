import assert from 'node:assert/strict'
import test from 'node:test'

import { agentStructuredResponseSchema } from '../../src/features/agent/schemas/agentSchema.ts'
import { followUpPlanMock } from '../../src/features/agent/mocks/followUpPlanMock.ts'
import {
  buildFollowUpPlanEvidence,
  generateFollowUpPlan,
  generateRealFollowUpPlan,
  groundFollowUpPlan,
} from '../../src/features/agent/server/generateFollowUpPlan.ts'
import {
  FollowUpPlanOrchestrationError,
  orchestrateFollowUpPlanRequest,
} from '../../src/features/agent/server/followUpPlanOrchestration.ts'
import type { StudentContext } from '../../src/features/agent/types/memory.types.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const STUDENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OBSERVATION_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff'

function fictitiousContext(overrides: Partial<StudentContext> = {}): StudentContext {
  return {
    kind: 'context',
    student: {
      id: STUDENT_ID,
      firstName: 'Maélis',
      lastName: 'Roy',
      fullName: 'Maélis Roy',
      sex: 'F',
      familyLanguage: 'fr',
      needs: ['Développer un vocabulaire scolaire plus précis en français.'],
      institutionalAdaptations: ['Temps supplémentaire'],
      interventionPlan: false,
      generalNotes: '',
    },
    classes: [
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        name: 'Classe fictive 8A',
        level: '8e année',
        subject: 'Français',
        documentTemplate: null,
        documentTemplatePath: null,
      },
    ],
    observations: [
      {
        id: OBSERVATION_ID,
        sessionId: null,
        category: 'progress',
        tag: 'À suivre',
        note: 'Besoin de soutien en lecture',
        createdAt: '2026-09-10T08:00:00.000Z',
      },
    ],
    participations: [],
    attendance: [],
    contentVariants: [],
    evaluationResults: [],
    ...overrides,
  }
}

test('buildFollowUpPlanEvidence expose un identifiant réel par observation et un identifiant stable par adaptation', () => {
  const evidence = buildFollowUpPlanEvidence(fictitiousContext())
  assert.deepEqual(evidence, [
    { sourceId: OBSERVATION_ID, label: 'Observation du 2026-09-10 — À suivre : Besoin de soutien en lecture' },
    { sourceId: 'adaptation-0', label: 'Adaptation en place : Temps supplémentaire' },
  ])
})

test('groundFollowUpPlan ne conserve que les éléments dont le sourceId correspond à une preuve réelle', () => {
  const evidence = buildFollowUpPlanEvidence(fictitiousContext())
  const plan = groundFollowUpPlan(
    {
      items: [
        { sourceId: OBSERVATION_ID, constat: 'Constat réel', objectif: 'Objectif réel', indicateur: 'Indicateur réel', echeance: 'dans 6 semaines', prochaineEtape: 'Étape réelle' },
        { sourceId: 'source-inventee', constat: 'Constat halluciné', objectif: 'x', indicateur: 'i', echeance: 'e', prochaineEtape: 'y' },
      ],
    },
    evidence,
    'Maélis Roy'
  )

  assert.equal(plan.eleve.nom, 'Maélis Roy')
  assert.equal(plan.items.length, 1)
  assert.equal(plan.items[0]?.source, 'Observation du 2026-09-10 — À suivre : Besoin de soutien en lecture')
  assert.equal(plan.items[0]?.constat, 'Constat réel')
})

test('groundFollowUpPlan rejette un sourceId réutilisé plusieurs fois', () => {
  const evidence = buildFollowUpPlanEvidence(fictitiousContext())
  const plan = groundFollowUpPlan(
    {
      items: [
        { sourceId: OBSERVATION_ID, constat: 'Premier', objectif: 'x', indicateur: 'i', echeance: 'e', prochaineEtape: 'y' },
        { sourceId: OBSERVATION_ID, constat: 'Doublon', objectif: 'x', indicateur: 'i', echeance: 'e', prochaineEtape: 'y' },
      ],
    },
    evidence,
    'Maélis Roy'
  )
  assert.equal(plan.items.length, 1)
  assert.equal(plan.items[0]?.constat, 'Premier')
})

test('generateRealFollowUpPlan rejette une sortie sans aucun sourceId valide', async () => {
  await assert.rejects(() =>
    generateRealFollowUpPlan({ studentContext: fictitiousContext() }, async () => ({
      items: [{ sourceId: 'invente', constat: 'x', objectif: 'y', indicateur: 'i', echeance: 'e', prochaineEtape: 'z' }],
    }))
  )
})

test('la chaîne mock traverse génération et réponse structurée sans réseau IA', async () => {
  const previousMode = process.env.FOLLOW_UP_PLAN_GENERATION_MODE
  process.env.FOLLOW_UP_PLAN_GENERATION_MODE = 'mock'

  try {
    const response = await orchestrateFollowUpPlanRequest(
      { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
      {
        getStudentContext: async () => fictitiousContext(),
        generateFollowUpPlan,
        checkUsage: async () => ({ allowed: true }),
        refundUsage: async () => 0,
      }
    )
    const structured = agentStructuredResponseSchema.parse(response)
    assert.equal(structured.kind, 'follow_up_plan')
    if (structured.kind !== 'follow_up_plan') return
    assert.deepEqual(structured.items, followUpPlanMock.items)
    assert.match(structured.message, /Maélis Roy/)
  } finally {
    if (previousMode === undefined) delete process.env.FOLLOW_UP_PLAN_GENERATION_MODE
    else process.env.FOLLOW_UP_PLAN_GENERATION_MODE = previousMode
  }
})

test('élève sans observation ni adaptation : absence de données explicite, aucun brouillon vide', async () => {
  let generationCalls = 0
  let usageCalls = 0

  const response = await orchestrateFollowUpPlanRequest(
    { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
    {
      getStudentContext: async () =>
        fictitiousContext({ observations: [], student: { ...fictitiousContext().student, institutionalAdaptations: [] } }),
      generateFollowUpPlan: async () => {
        generationCalls += 1
        return followUpPlanMock
      },
      checkUsage: async () => {
        usageCalls += 1
        return { allowed: true }
      },
      refundUsage: async () => 0,
    }
  )

  assert.equal(response.kind, 'student_data_missing')
  assert.equal(generationCalls, 0)
  assert.equal(usageCalls, 0)
})

test('ambiguïté et élève inconnu ne déclenchent ni génération ni quota', async () => {
  let generationCalls = 0
  let usageCalls = 0
  const baseDependencies = {
    generateFollowUpPlan: async () => {
      generationCalls += 1
      return followUpPlanMock
    },
    checkUsage: async () => {
      usageCalls += 1
      return { allowed: true }
    },
    refundUsage: async () => 0,
  }

  const ambiguity = await orchestrateFollowUpPlanRequest(
    { studentQuery: 'Jess', trustedUserId: USER_ID },
    {
      ...baseDependencies,
      getStudentContext: async () => ({
        kind: 'ambiguous' as const,
        candidates: [
          { id: STUDENT_ID, firstName: 'Malo', lastName: 'Vandel', fullName: 'Malo Vandel', classes: fictitiousContext().classes },
          { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', firstName: 'Malorie', lastName: 'Arquet', fullName: 'Malorie Arquet', classes: fictitiousContext().classes },
        ],
      }),
    }
  )
  assert.equal(ambiguity.kind, 'clarification')

  const unknown = await orchestrateFollowUpPlanRequest(
    { studentQuery: 'Inconnu', trustedUserId: USER_ID },
    { ...baseDependencies, getStudentContext: async () => null }
  )
  assert.equal(unknown.kind, 'student_not_found')
  assert.equal(generationCalls, 0)
  assert.equal(usageCalls, 0)
})

test('un échec de génération rembourse exactement une fois', async () => {
  let refundCalls = 0
  await assert.rejects(
    () =>
      orchestrateFollowUpPlanRequest(
        { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
        {
          getStudentContext: async () => fictitiousContext(),
          generateFollowUpPlan: async () => {
            throw new Error('Sortie invalide')
          },
          checkUsage: async () => ({ allowed: true }),
          refundUsage: async () => {
            refundCalls += 1
          },
        }
      ),
    (error: unknown) =>
      error instanceof FollowUpPlanOrchestrationError && error.code === 'FOLLOW_UP_PLAN_GENERATION_FAILED'
  )
  assert.equal(refundCalls, 1)
})

test('une génération réussie débite le quota une seule fois sans remboursement', async () => {
  let usageCalls = 0
  let generationCalls = 0
  let refundCalls = 0

  const response = await orchestrateFollowUpPlanRequest(
    { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
    {
      getStudentContext: async () => fictitiousContext(),
      generateFollowUpPlan: async () => {
        generationCalls += 1
        return followUpPlanMock
      },
      checkUsage: async () => {
        usageCalls += 1
        return { allowed: true }
      },
      refundUsage: async () => {
        refundCalls += 1
      },
    }
  )

  assert.equal(response.kind, 'follow_up_plan')
  assert.equal(usageCalls, 1)
  assert.equal(generationCalls, 1)
  assert.equal(refundCalls, 0)
})
