import assert from 'node:assert/strict'
import test from 'node:test'

import { agentStructuredResponseSchema } from '../../src/features/agent/schemas/agentSchema.ts'
import { patMock } from '../../src/features/agent/mocks/patMock.ts'
import {
  generatePAT,
  generateRealPAT,
} from '../../src/features/agent/server/generatePAT.ts'
import {
  orchestratePATRequest,
  PATOrchestrationError,
} from '../../src/features/agent/server/patOrchestration.ts'
import {
  parseAndValidatePAT,
  PATValidationError,
} from '../../src/features/agent/server/patValidation.ts'
import type { StudentContext } from '../../src/features/agent/types/memory.types.ts'
import { exportPATToDocx } from '../../src/features/agent/utils/exportPATDocx.ts'
import { buildPATPrompt } from '../../src/features/agent/server/patPrompt.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const STUDENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function fictitiousContext(): StudentContext {
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
      institutionalAdaptations: [...patMock.adaptationsOffertes],
      interventionPlan: false,
      generalNotes: 'Mobilise efficacement les supports visuels.',
    },
    classes: [
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        name: 'Classe fictive 8A',
        level: '8e année',
        subject: 'Français',
      },
    ],
    observations: [],
    participations: [],
    attendance: [],
    contentVariants: [
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        adaptationSetId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        title: 'Support de cours différencié fictif',
        subject: 'Français',
        level: '8e année',
        suggestedVariant: 'support',
        createdAt: '2026-01-10T12:00:00.000Z',
      },
    ],
  }
}

test('la chaîne mock traverse génération, réponse structurée et export DOCX sans réseau IA', async () => {
  const previousMode = process.env.PAT_GENERATION_MODE
  const previousFetch = globalThis.fetch
  process.env.PAT_GENERATION_MODE = 'mock'
  globalThis.fetch = async () => {
    throw new Error('Aucun appel réseau attendu en mode mock')
  }

  try {
    const response = await orchestratePATRequest(
      { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
      {
        getStudentContext: async () => fictitiousContext(),
        generatePAT,
        checkUsage: async () => ({ allowed: true }),
        refundUsage: async () => 0,
      }
    )
    const structured = agentStructuredResponseSchema.parse(response)
    assert.equal(structured.kind, 'pat')
    if (structured.kind !== 'pat') return

    const docx = await exportPATToDocx(structured.pat)
    assert.equal(docx.subarray(0, 2).toString('ascii'), 'PK')
  } finally {
    globalThis.fetch = previousFetch
    if (previousMode === undefined) delete process.env.PAT_GENERATION_MODE
    else process.env.PAT_GENERATION_MODE = previousMode
  }
})

test('ambiguïté et élève inconnu ne déclenchent ni génération ni quota', async () => {
  let generationCalls = 0
  let usageCalls = 0
  const baseDependencies = {
    generatePAT: async () => {
      generationCalls += 1
      return patMock
    },
    checkUsage: async () => {
      usageCalls += 1
      return { allowed: true }
    },
    refundUsage: async () => 0,
  }

  const ambiguity = await orchestratePATRequest(
    { studentQuery: 'Jess', trustedUserId: USER_ID },
    {
      ...baseDependencies,
      getStudentContext: async () => ({
        kind: 'ambiguous' as const,
        candidates: [
          {
            id: STUDENT_ID,
            firstName: 'Malo',
            lastName: 'Vandel',
            fullName: 'Malo Vandel',
            classes: fictitiousContext().classes,
          },
          {
            id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
            firstName: 'Malorie',
            lastName: 'Arquet',
            fullName: 'Malorie Arquet',
            classes: fictitiousContext().classes,
          },
        ],
      }),
    }
  )
  assert.equal(ambiguity.kind, 'clarification')

  const unknown = await orchestratePATRequest(
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
      orchestratePATRequest(
        { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
        {
          getStudentContext: async () => fictitiousContext(),
          generatePAT: async () => {
            throw new Error('Sortie invalide')
          },
          checkUsage: async () => ({ allowed: true }),
          refundUsage: async () => {
            refundCalls += 1
          },
        }
      ),
    (error: unknown) =>
      error instanceof PATOrchestrationError && error.code === 'PAT_GENERATION_FAILED'
  )
  assert.equal(refundCalls, 1)
})

test('une génération réussie débite le quota une seule fois sans remboursement', async () => {
  let usageCalls = 0
  let generationCalls = 0
  let refundCalls = 0

  const response = await orchestratePATRequest(
    { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
    {
      getStudentContext: async () => fictitiousContext(),
      generatePAT: async () => {
        generationCalls += 1
        return patMock
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

  assert.equal(response.kind, 'pat')
  assert.equal(usageCalls, 1)
  assert.equal(generationCalls, 1)
  assert.equal(refundCalls, 0)
})

test('rejette une sortie invalide et les besoins formulés négativement', () => {
  assert.throws(
    () => parseAndValidatePAT('{"eleve":'),
    (error: unknown) => error instanceof PATValidationError && error.code === 'INVALID_PAT'
  )

  assert.throws(
    () =>
      parseAndValidatePAT({
        ...patMock,
        habiletes: { ...patMock.habiletes, besoins: ['Élève en difficulté à l’écrit.'] },
      }),
    (error: unknown) =>
      error instanceof PATValidationError && error.code === 'NEGATIVE_NEED'
  )
})

test('conserve l’omission réelle des champs facultatifs non documentés', () => {
  const minimal = parseAndValidatePAT({
    eleve: { nom: 'Naya Dorel' },
    habiletes: {
      forces: ['Mobilise les supports visuels avec autonomie.'],
      besoins: ['Développer les stratégies de planification.'],
    },
    comportementsCibles: [],
    modalitesAppui: [],
    adaptationsOffertes: [],
  })

  assert.equal('niveau' in minimal.eleve, false)
  assert.equal('profil' in minimal.eleve, false)
  assert.equal('recommandationsPSAC' in minimal, false)
  assert.equal('francisation' in minimal, false)
})

test('la branche réelle ancre l’identité et les adaptations dans le dossier élève', async () => {
  const context = fictitiousContext()
  const generated = await generateRealPAT({ studentContext: context }, async () => ({
    ...patMock,
    eleve: { ...patMock.eleve, nom: 'Autre élève' },
    adaptationsOffertes: ['Support de cours différencié fictif'],
  }))

  assert.equal(generated.eleve.nom, 'Maélis Roy')
  assert.equal(generated.eleve.niveau, '8e année')
  assert.deepEqual(generated.adaptationsOffertes, context.student.institutionalAdaptations)
  assert.equal(generated.adaptationsOffertes.includes('Support de cours différencié fictif'), false)
})

test('le prompt réel exclut les variantes de contenu pédagogique', () => {
  const prompt = buildPATPrompt(fictitiousContext())

  assert.match(prompt, /adaptationsInstitutionnelles/)
  assert.doesNotMatch(prompt, /Support de cours différencié fictif/)
  assert.doesNotMatch(prompt, /contentVariants/)
})

test('la branche réelle rejette une sortie structurée invalide', async () => {
  await assert.rejects(
    () => generateRealPAT({ studentContext: fictitiousContext() }, async () => ({ eleve: {} })),
    (error: unknown) => error instanceof PATValidationError && error.code === 'INVALID_PAT'
  )
})

test('la branche réelle retire les champs optionnels sans preuve source', async () => {
  const context: StudentContext = {
    ...fictitiousContext(),
    student: {
      ...fictitiousContext().student,
      familyLanguage: 'fr',
      needs: ['Développer les stratégies de planification.'],
      generalNotes: '',
    },
    observations: [],
    participations: [],
    attendance: [],
  }
  const generated = await generateRealPAT({ studentContext: context }, async () => patMock)

  assert.equal('francisation' in generated, false)
  assert.ok(
    generated.comportementsCibles.every(
      (target) => !('date' in target) && !('preuvesProgression' in target)
    )
  )
})

test('la branche réelle ne conserve que les dates présentes dans l’historique', async () => {
  const context: StudentContext = {
    ...fictitiousContext(),
    observations: [
      {
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        sessionId: null,
        category: 'progress',
        tag: 'Progrès fictif',
        note: 'Mobilise une stratégie avec davantage d’autonomie.',
        createdAt: '2026-09-15T08:00:00.000Z',
      },
    ],
  }
  const output = {
    ...patMock,
    comportementsCibles: [
      { ...patMock.comportementsCibles[0], date: '2026-09-15' },
      { ...patMock.comportementsCibles[1], date: '2026-12-31' },
    ],
  }
  const generated = await generateRealPAT({ studentContext: context }, async () => output)

  assert.equal(generated.comportementsCibles[0]?.date, '2026-09-15')
  assert.equal('date' in (generated.comportementsCibles[1] ?? {}), false)
})
