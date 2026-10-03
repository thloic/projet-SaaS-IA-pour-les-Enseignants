import assert from 'node:assert/strict'
import test from 'node:test'

import { looksLikeParentEmailRequest } from '../../src/features/agent/server/parentEmailIntent.ts'
import {
  resolveParentEmailExtraction,
  type ParentEmailExtraction,
} from '../../src/features/agent/schemas/parentEmailIntentSchema.ts'
import {
  orchestrateParentEmailRequest,
  ParentEmailOrchestrationError,
  type ParentEmailDraftRecord,
} from '../../src/features/agent/server/parentEmailOrchestration.ts'
import type { StudentContext } from '../../src/features/agent/types/memory.types.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const STUDENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const CLASS_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function emptyExtraction(): ParentEmailExtraction {
  return { studentQuery: null, register: null, situation: null, parentEmail: null }
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

function baseDependencies(overrides: Partial<Parameters<typeof orchestrateParentEmailRequest>[1]> = {}) {
  return {
    extractParentEmailFields: async () => ({
      studentQuery: 'Naya',
      register: 'comportement',
      situation: 'Agitation répétée pendant les travaux de groupe.',
      parentEmail: null,
    }),
    getStudentContext: async () => fictitiousContext(),
    generateParentEmailDraft: async () => ({
      subject: 'Point sur le comportement en classe',
      body: 'Un brouillon de courriel suffisamment long pour être valide et envoyable.',
    }),
    saveParentEmailDraft: async () => ({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }),
    checkUsage: async () => ({ allowed: true }),
    refundUsage: async () => 0,
    ...overrides,
  }
}

test('looksLikeParentEmailRequest reconnaît les formulations fr/en/es et ignore le reste', () => {
  assert.equal(looksLikeParentEmailRequest('Je veux écrire un courriel aux parents de Naya'), true)
  assert.equal(looksLikeParentEmailRequest('Write a parent email for Naya'), true)
  assert.equal(looksLikeParentEmailRequest('Quiero escribir un correo a los padres de Naya'), true)
  assert.equal(looksLikeParentEmailRequest('Génère le PAT de Naya'), false)
  assert.equal(looksLikeParentEmailRequest('Bonjour, comment ça va ?'), false)
})

test('looksLikeParentEmailRequest reconnaît "courriel"/"email" seuls, sans le mot "parent", et tolère la coquille "couriel"', () => {
  assert.equal(
    looksLikeParentEmailRequest('Crée-moi un couriel pour cet élève Naya, avec observation de comportement. En brouillon'),
    true
  )
  assert.equal(looksLikeParentEmailRequest('Rédige un courriel pour Naya au sujet de son échec'), true)
  assert.equal(looksLikeParentEmailRequest('Write an email for Naya about plagiarism'), true)
  assert.equal(looksLikeParentEmailRequest('Redacta un correo sobre Naya'), true)
  assert.equal(
    looksLikeParentEmailRequest('Envoie un corriel au parent de Naya, leur email c’est parent@example.com'),
    true
  )
})

test('resolveParentEmailExtraction exige élève + motif, la situation reste facultative à ce stade', () => {
  assert.equal(resolveParentEmailExtraction(emptyExtraction()), null)
  assert.equal(
    resolveParentEmailExtraction({ ...emptyExtraction(), studentQuery: 'Naya' }),
    null
  )

  const resolved = resolveParentEmailExtraction({
    studentQuery: 'Naya',
    register: 'echec',
    situation: null,
    parentEmail: null,
  })
  assert.deepEqual(resolved, {
    studentQuery: 'Naya',
    register: 'echec',
    situation: undefined,
    suggestedRecipientEmail: undefined,
  })

  const resolvedWithEmail = resolveParentEmailExtraction({
    studentQuery: 'Naya',
    register: 'echec',
    situation: null,
    parentEmail: 'parent@example.com',
  })
  assert.equal(resolvedWithEmail?.suggestedRecipientEmail, 'parent@example.com')

  const resolvedWithInvalidEmail = resolveParentEmailExtraction({
    studentQuery: 'Naya',
    register: 'echec',
    situation: null,
    parentEmail: 'pas-un-email',
  })
  assert.equal(resolvedWithInvalidEmail?.suggestedRecipientEmail, undefined)
})

test('extraction invalide ou incomplète : aucune génération, aucun appel de quota, réponse null', async () => {
  let studentLookups = 0
  let usageCalls = 0
  let generationCalls = 0

  const dependencies = baseDependencies({
    extractParentEmailFields: async () => ({ not: 'a valid extraction shape' }),
    getStudentContext: async () => {
      studentLookups += 1
      return fictitiousContext()
    },
    checkUsage: async () => {
      usageCalls += 1
      return { allowed: true }
    },
    generateParentEmailDraft: async () => {
      generationCalls += 1
      return { subject: 'x', body: 'x'.repeat(90) }
    },
  })

  const invalidShapeResult = await orchestrateParentEmailRequest(
    { message: 'peu importe', trustedUserId: USER_ID },
    dependencies
  )
  assert.equal(invalidShapeResult, null)

  const incompleteResult = await orchestrateParentEmailRequest(
    { message: 'Écris un courriel aux parents de Naya', trustedUserId: USER_ID },
    {
      ...dependencies,
      extractParentEmailFields: async () => ({ studentQuery: 'Naya', register: null, situation: null, parentEmail: null }),
    }
  )
  assert.equal(incompleteResult, null)

  assert.equal(studentLookups, 0)
  assert.equal(usageCalls, 0)
  assert.equal(generationCalls, 0)
})

test('élève ambigu ou introuvable : réponse structurée dédiée, sans génération ni quota', async () => {
  const ambiguous = await orchestrateParentEmailRequest(
    { message: 'Courriel aux parents de Naya', trustedUserId: USER_ID },
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

  const notFound = await orchestrateParentEmailRequest(
    { message: 'Courriel aux parents de Inconnu', trustedUserId: USER_ID },
    baseDependencies({ getStudentContext: async () => null })
  )
  assert.equal(notFound?.kind, 'student_not_found')
})

test('motif "comportement" sans observation de comportement ni situation décrite : blocage avant génération et quota', async () => {
  let usageCalls = 0
  let generationCalls = 0

  const result = await orchestrateParentEmailRequest(
    { message: 'Courriel aux parents de Naya', trustedUserId: USER_ID },
    baseDependencies({
      extractParentEmailFields: async () => ({ studentQuery: 'Naya', register: 'comportement', situation: null, parentEmail: null }),
      getStudentContext: async () => fictitiousContext(),
      checkUsage: async () => { usageCalls += 1; return { allowed: true } },
      generateParentEmailDraft: async () => { generationCalls += 1; return { subject: 'x', body: 'x'.repeat(90) } },
    })
  )

  assert.equal(result?.kind, 'student_data_missing')
  assert.equal(usageCalls, 0)
  assert.equal(generationCalls, 0)
})

test('motif "comportement" ancré sur une observation réelle de catégorie comportement : génération autorisée', async () => {
  const context = fictitiousContext({
    observations: [
      {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        sessionId: null,
        category: 'behavior',
        tag: 'Agitation en groupe',
        note: null,
        createdAt: '2026-09-10T10:00:00.000Z',
      },
    ],
  })

  const result = await orchestrateParentEmailRequest(
    { message: 'Courriel aux parents de Naya', trustedUserId: USER_ID },
    baseDependencies({
      extractParentEmailFields: async () => ({ studentQuery: 'Naya', register: 'comportement', situation: null, parentEmail: null }),
      getStudentContext: async () => context,
    })
  )

  assert.equal(result?.kind, 'parent_email_draft')
})

test('une observation hors-catégorie comportement ne suffit pas à ancrer un courriel sur le comportement', async () => {
  const context = fictitiousContext({
    observations: [
      {
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        sessionId: null,
        category: 'progress',
        tag: 'Progression fictive',
        note: null,
        createdAt: '2026-09-10T10:00:00.000Z',
      },
    ],
  })
  let usageCalls = 0

  const result = await orchestrateParentEmailRequest(
    { message: 'Courriel aux parents de Naya', trustedUserId: USER_ID },
    baseDependencies({
      extractParentEmailFields: async () => ({ studentQuery: 'Naya', register: 'comportement', situation: null, parentEmail: null }),
      getStudentContext: async () => context,
      checkUsage: async () => { usageCalls += 1; return { allowed: true } },
    })
  )

  assert.equal(result?.kind, 'student_data_missing')
  assert.equal(usageCalls, 0)
})

test('motif "echec" ancré sur un résultat réel : génération autorisée', async () => {
  const context = fictitiousContext({
    evaluationResults: [
      {
        id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        classId: CLASS_ID,
        title: 'Contrôle fictif',
        grade: '45%',
        createdAt: '2026-09-10T10:00:00.000Z',
      },
    ],
  })

  const result = await orchestrateParentEmailRequest(
    { message: 'Courriel aux parents de Naya', trustedUserId: USER_ID },
    baseDependencies({
      extractParentEmailFields: async () => ({ studentQuery: 'Naya', register: 'echec', situation: null, parentEmail: null }),
      getStudentContext: async () => context,
    })
  )

  assert.equal(result?.kind, 'parent_email_draft')
})

test('motif "plagiat" sans situation décrite par l’enseignant : blocage, aucune donnée ne peut l’ancrer', async () => {
  let usageCalls = 0

  const result = await orchestrateParentEmailRequest(
    { message: 'Courriel aux parents de Naya', trustedUserId: USER_ID },
    baseDependencies({
      extractParentEmailFields: async () => ({ studentQuery: 'Naya', register: 'plagiat', situation: null, parentEmail: null }),
      checkUsage: async () => { usageCalls += 1; return { allowed: true } },
    })
  )

  assert.equal(result?.kind, 'student_data_missing')
  assert.equal(usageCalls, 0)
})

test('motif "plagiat" avec une situation décrite par l’enseignant : génération autorisée, situation transmise à la génération', async () => {
  let receivedSituation: string | undefined

  const result = await orchestrateParentEmailRequest(
    { message: 'Courriel aux parents de Naya au sujet d’un plagiat', trustedUserId: USER_ID },
    baseDependencies({
      extractParentEmailFields: async () => ({
        studentQuery: 'Naya',
        register: 'plagiat',
        situation: 'Copie identique à celle d’un autre élève sur le devoir du 10 septembre.',
        parentEmail: null,
      }),
      generateParentEmailDraft: async (input) => {
        receivedSituation = input.situation
        return { subject: 'x', body: 'x'.repeat(90) }
      },
    })
  )

  assert.equal(result?.kind, 'parent_email_draft')
  assert.equal(receivedSituation, 'Copie identique à celle d’un autre élève sur le devoir du 10 septembre.')
})

test('génération réussie : enregistrement avec le bon motif et le bon class_id, une seule charge de quota', async () => {
  let usageCalls = 0
  const savedRecords: ParentEmailDraftRecord[] = []

  const result = await orchestrateParentEmailRequest(
    { message: 'Courriel aux parents de Naya', trustedUserId: USER_ID },
    baseDependencies({
      checkUsage: async () => { usageCalls += 1; return { allowed: true } },
      saveParentEmailDraft: async (record) => {
        savedRecords.push(record)
        return { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }
      },
    })
  )

  assert.equal(result?.kind, 'parent_email_draft')
  if (result?.kind === 'parent_email_draft') {
    assert.equal(result.studentId, STUDENT_ID)
    assert.equal(result.draftId, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')
    assert.equal(result.register, 'comportement')
  }
  assert.equal(usageCalls, 1)
  assert.equal(savedRecords[0]?.studentId, STUDENT_ID)
  assert.equal(savedRecords[0]?.classId, CLASS_ID)
  assert.equal(savedRecords[0]?.register, 'comportement')
})

test('une adresse de parent donnée dans le message préremplit suggestedRecipientEmail, jamais utilisée pour envoyer automatiquement', async () => {
  const result = await orchestrateParentEmailRequest(
    { message: 'Courriel aux parents de Naya, leur email c’est parent@example.com', trustedUserId: USER_ID },
    baseDependencies({
      extractParentEmailFields: async () => ({
        studentQuery: 'Naya',
        register: 'comportement',
        situation: 'Agitation répétée pendant les travaux de groupe.',
        parentEmail: 'parent@example.com',
      }),
    })
  )

  assert.equal(result?.kind, 'parent_email_draft')
  if (result?.kind === 'parent_email_draft') {
    assert.equal(result.suggestedRecipientEmail, 'parent@example.com')
  }
})

test('échec de génération : remboursement exactement une fois, quota déjà débité une fois', async () => {
  let refundCalls = 0
  let usageCalls = 0

  await assert.rejects(
    () =>
      orchestrateParentEmailRequest(
        { message: 'Courriel aux parents de Naya', trustedUserId: USER_ID },
        baseDependencies({
          checkUsage: async () => { usageCalls += 1; return { allowed: true } },
          generateParentEmailDraft: async () => { throw new Error('échec simulé') },
          refundUsage: async () => { refundCalls += 1 },
        })
      ),
    (error: unknown) =>
      error instanceof ParentEmailOrchestrationError && error.code === 'PARENT_EMAIL_GENERATION_FAILED'
  )

  assert.equal(usageCalls, 1)
  assert.equal(refundCalls, 1)
})

test('quota dépassé : aucune génération tentée', async () => {
  let generationCalls = 0

  await assert.rejects(
    () =>
      orchestrateParentEmailRequest(
        { message: 'Courriel aux parents de Naya', trustedUserId: USER_ID },
        baseDependencies({
          checkUsage: async () => ({ allowed: false }),
          generateParentEmailDraft: async () => {
            generationCalls += 1
            return { subject: 'x', body: 'x'.repeat(90) }
          },
        })
      ),
    (error: unknown) =>
      error instanceof ParentEmailOrchestrationError && error.code === 'PARENT_EMAIL_QUOTA_EXCEEDED'
  )

  assert.equal(generationCalls, 0)
})
