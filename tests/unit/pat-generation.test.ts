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
  selectDocumentTemplate,
} from '../../src/features/agent/server/patOrchestration.ts'
import {
  parseAndValidatePAT,
  PATValidationError,
} from '../../src/features/agent/server/patValidation.ts'
import type { StudentContext } from '../../src/features/agent/types/memory.types.ts'
import type { ResolvedDocumentTemplate } from '../../src/features/agent/types/documentTemplate.types.ts'
import { exportPATToDocx } from '../../src/features/agent/utils/exportPATDocx.ts'
import { buildPATPrompt } from '../../src/features/agent/server/patPrompt.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const STUDENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const SAMPLE_TEMPLATE =
  'Modèle utilisé par l’enseignant : forces observées, besoins prioritaires, interventions prévues, adaptations en place.'
const TEXT_TEMPLATE: ResolvedDocumentTemplate = { kind: 'text', content: SAMPLE_TEMPLATE }
const failPdfFetch = async () => {
  throw new Error('Aucune lecture de PDF attendue pour un modèle texte')
}

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
        documentTemplate: SAMPLE_TEMPLATE,
        documentTemplatePath: null,
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
    evaluationResults: [],
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
        fetchTemplatePdfBase64: failPdfFetch,
        generatePAT,
        savePAT: async () => {},
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
    fetchTemplatePdfBase64: failPdfFetch,
    generatePAT: async () => {
      generationCalls += 1
      return patMock
    },
    savePAT: async () => {},
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
          fetchTemplatePdfBase64: failPdfFetch,
          generatePAT: async () => {
            throw new Error('Sortie invalide')
          },
          savePAT: async () => {},
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
  let saveCalls = 0

  const response = await orchestratePATRequest(
    { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
    {
      getStudentContext: async () => fictitiousContext(),
      fetchTemplatePdfBase64: failPdfFetch,
      generatePAT: async () => {
        generationCalls += 1
        return patMock
      },
      savePAT: async (record) => {
        saveCalls += 1
        assert.equal(record.studentId, STUDENT_ID)
        assert.equal(record.classId, fictitiousContext().classes[0]?.id)
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
  assert.equal(saveCalls, 1)
})

test('le prompt de modification inclut le PAT précédent et conserve l’instruction exacte', () => {
  const prompt = buildPATPrompt(fictitiousContext(), TEXT_TEMPLATE, 'fr', {
    previousPat: patMock,
    modificationInstruction: 'Rends uniquement la recommandation plus concise.',
  })
  assert.match(prompt, /DOCUMENT PRÉCÉDENT/)
  assert.match(prompt, /Rends uniquement la recommandation plus concise\./)
  assert.match(prompt, /Applique uniquement l’instruction demandée/)
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

  assert.throws(
    () =>
      parseAndValidatePAT({
        ...patMock,
        habiletes: { ...patMock.habiletes, besoins: ['La alumna no puede escribir un texto.'] },
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
  const generated = await generateRealPAT(
    { studentContext: context, documentTemplate: TEXT_TEMPLATE },
    async () => ({
      ...patMock,
      eleve: { ...patMock.eleve, nom: 'Autre élève' },
      adaptationsOffertes: ['Support de cours différencié fictif'],
    })
  )

  assert.equal(generated.eleve.nom, 'Maélis Roy')
  assert.equal(generated.eleve.niveau, '8e année')
  assert.deepEqual(generated.adaptationsOffertes, context.student.institutionalAdaptations)
  assert.equal(generated.adaptationsOffertes.includes('Support de cours différencié fictif'), false)
})

test('le prompt réel exclut les variantes de contenu pédagogique', () => {
  const prompt = buildPATPrompt(fictitiousContext(), TEXT_TEMPLATE)

  assert.match(prompt, /adaptationsInstitutionnelles/)
  assert.doesNotMatch(prompt, /Support de cours différencié fictif/)
  assert.doesNotMatch(prompt, /contentVariants/)
})

test('le prompt réel intègre le modèle de document fourni par l’enseignant', () => {
  const prompt = buildPATPrompt(fictitiousContext(), TEXT_TEMPLATE)

  assert.match(prompt, /MODÈLE DE DOCUMENT FOURNI PAR L’ENSEIGNANT/)
  assert.ok(prompt.includes(SAMPLE_TEMPLATE))
})

test('le parcours PAT transmet la langue espagnole jusqu’au prompt structuré', async () => {
  let capturedPrompt = ''
  await generateRealPAT(
    { studentContext: fictitiousContext(), language: 'es', documentTemplate: TEXT_TEMPLATE },
    async (prompt) => {
      capturedPrompt = prompt
      return patMock
    }
  )

  assert.match(capturedPrompt, /espagnol international/i)

  let capturedLanguage: string | undefined
  const response = await orchestratePATRequest(
    {
      studentQuery: 'Maélis Roy',
      trustedUserId: USER_ID,
      contentLanguage: 'es',
      interfaceLanguage: 'es',
    },
    {
      getStudentContext: async () => fictitiousContext(),
      fetchTemplatePdfBase64: failPdfFetch,
      generatePAT: async ({ language }) => {
        capturedLanguage = language
        return patMock
      },
      savePAT: async () => {},
      checkUsage: async () => ({ allowed: true }),
      refundUsage: async () => 0,
    }
  )

  assert.equal(capturedLanguage, 'es')
  assert.equal(response.kind, 'pat')
  if (response.kind === 'pat') assert.equal(response.language, 'es')
})

test('la branche réelle rejette une sortie structurée invalide', async () => {
  await assert.rejects(
    () =>
      generateRealPAT(
        { studentContext: fictitiousContext(), documentTemplate: TEXT_TEMPLATE },
        async () => ({ eleve: {} })
      ),
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
  const generated = await generateRealPAT(
    { studentContext: context, documentTemplate: TEXT_TEMPLATE },
    async () => patMock
  )

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
  const generated = await generateRealPAT(
    { studentContext: context, documentTemplate: TEXT_TEMPLATE },
    async () => output
  )

  assert.equal(generated.comportementsCibles[0]?.date, '2026-09-15')
  assert.equal('date' in (generated.comportementsCibles[1] ?? {}), false)
})

test('selectDocumentTemplate retient déterministement la première classe (ordre alphabétique) avec un modèle', () => {
  assert.equal(selectDocumentTemplate([]), null)

  assert.equal(
    selectDocumentTemplate([
      { id: '1', name: 'Classe A', level: '1', subject: 'Français', documentTemplate: null, documentTemplatePath: null },
      { id: '2', name: 'Classe B', level: '1', subject: 'Français', documentTemplate: '  ', documentTemplatePath: null },
    ]),
    null
  )

  const result = selectDocumentTemplate([
    { id: '1', name: 'Classe Zoulou', level: '1', subject: 'Français', documentTemplate: 'Modèle Z', documentTemplatePath: null },
    { id: '2', name: 'Classe Alpha', level: '1', subject: 'Français', documentTemplate: 'Modèle A', documentTemplatePath: null },
    { id: '3', name: 'Classe Bravo', level: '1', subject: 'Français', documentTemplate: null, documentTemplatePath: null },
  ])
  assert.deepEqual(result, { source: 'text', content: 'Modèle A', className: 'Classe Alpha', classId: '2' })
})

test('selectDocumentTemplate priorise le PDF sur le texte pour la même classe', () => {
  const result = selectDocumentTemplate([
    {
      id: '1',
      name: 'Classe Zoulou',
      level: '1',
      subject: 'Français',
      documentTemplate: 'Modèle Z',
      documentTemplatePath: null,
    },
    {
      id: '2',
      name: 'Classe Alpha',
      level: '1',
      subject: 'Français',
      documentTemplate: 'Texte legacy conservé',
      documentTemplatePath: 'user-1/2.pdf',
    },
  ])
  assert.deepEqual(result, {
    source: 'pdf',
    path: 'user-1/2.pdf',
    className: 'Classe Alpha',
    classId: '2',
  })
})

test('sans modèle configuré sur aucune classe de l’élève, l’agent bloque sans générer ni débiter le quota', async () => {
  let usageCalls = 0
  let generationCalls = 0

  const contextWithoutTemplate: StudentContext = {
    ...fictitiousContext(),
    classes: [{ ...fictitiousContext().classes[0], documentTemplate: null, documentTemplatePath: null }],
  }

  const response = await orchestratePATRequest(
    { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
    {
      getStudentContext: async () => contextWithoutTemplate,
      fetchTemplatePdfBase64: failPdfFetch,
      generatePAT: async () => {
        generationCalls += 1
        return patMock
      },
      savePAT: async () => {},
      checkUsage: async () => {
        usageCalls += 1
        return { allowed: true }
      },
      refundUsage: async () => 0,
    }
  )

  const structured = agentStructuredResponseSchema.parse(response)
  assert.equal(structured.kind, 'template_missing')
  assert.equal(usageCalls, 0)
  assert.equal(generationCalls, 0)
})

test('avec un modèle texte configuré, l’agent transmet ce modèle exact à la génération', async () => {
  let receivedTemplate: ResolvedDocumentTemplate | null = null

  const response = await orchestratePATRequest(
    { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
    {
      getStudentContext: async () => fictitiousContext(),
      fetchTemplatePdfBase64: failPdfFetch,
      generatePAT: async ({ documentTemplate }) => {
        receivedTemplate = documentTemplate
        return patMock
      },
      savePAT: async () => {},
      checkUsage: async () => ({ allowed: true }),
      refundUsage: async () => 0,
    }
  )

  assert.equal(response.kind, 'pat')
  assert.deepEqual(receivedTemplate, TEXT_TEMPLATE)
})

test('avec un modèle PDF configuré, l’agent lit le PDF et le transmet en pièce jointe à la génération', async () => {
  let receivedTemplate: ResolvedDocumentTemplate | null = null
  let fetchedPath = ''

  const contextWithPdf: StudentContext = {
    ...fictitiousContext(),
    classes: [
      {
        ...fictitiousContext().classes[0],
        documentTemplate: null,
        documentTemplatePath: 'user-1/bbbbbbbb.pdf',
      },
    ],
  }

  const response = await orchestratePATRequest(
    { studentQuery: 'Maélis Roy', trustedUserId: USER_ID },
    {
      getStudentContext: async () => contextWithPdf,
      fetchTemplatePdfBase64: async (path) => {
        fetchedPath = path
        return 'ZmFrZS1wZGYtY29udGVudA=='
      },
      generatePAT: async ({ documentTemplate }) => {
        receivedTemplate = documentTemplate
        return patMock
      },
      savePAT: async () => {},
      checkUsage: async () => ({ allowed: true }),
      refundUsage: async () => 0,
    }
  )

  assert.equal(response.kind, 'pat')
  assert.equal(fetchedPath, 'user-1/bbbbbbbb.pdf')
  assert.deepEqual(receivedTemplate, { kind: 'pdf', base64: 'ZmFrZS1wZGYtY29udGVudA==' })
})

test('le prompt réel mentionne la pièce jointe PDF sans texte de modèle en clair', () => {
  const prompt = buildPATPrompt(fictitiousContext(), { kind: 'pdf', base64: 'xxx' })

  assert.match(prompt, /pièce jointe/i)
  assert.doesNotMatch(prompt, /MODÈLE DE DOCUMENT FOURNI PAR L’ENSEIGNANT/)
})
