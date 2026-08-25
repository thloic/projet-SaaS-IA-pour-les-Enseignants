import assert from 'node:assert/strict'
import test from 'node:test'

import { looksLikeBulletinRequest } from '../../src/features/agent/server/bulletinIntent.ts'
import {
  resolveBulletinExtraction,
  type BulletinExtraction,
} from '../../src/features/agent/schemas/bulletinIntentSchema.ts'
import {
  orchestrateBulletinRequest,
  BulletinOrchestrationError,
  type BulletinCommentRecord,
} from '../../src/features/agent/server/bulletinOrchestration.ts'
import type { StudentContext } from '../../src/features/agent/types/memory.types.ts'
import type { ResolvedDocumentTemplate } from '../../src/features/agent/types/documentTemplate.types.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const STUDENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const CLASS_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const SAMPLE_TEMPLATE = 'Modèle utilisé par l’enseignant pour les commentaires de bulletin.'
const failPdfFetch = async () => {
  throw new Error('Aucune lecture de PDF attendue pour un modèle texte')
}

function emptyExtraction(): BulletinExtraction {
  return { studentQuery: null, subject: null, grade: null, observations: null, tone: null }
}

function fictitiousContext(
  documentTemplate: string | null,
  documentTemplatePath: string | null = null
): StudentContext {
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
        documentTemplate,
        documentTemplatePath,
      },
    ],
    observations: [],
    participations: [],
    attendance: [],
    contentVariants: [],
    evaluationResults: [
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        classId: CLASS_ID,
        title: 'Contrôle fictif',
        grade: '85%',
        createdAt: '2026-02-10T10:00:00.000Z',
      },
    ],
  }
}

function baseDependencies(overrides: Partial<Parameters<typeof orchestrateBulletinRequest>[1]> = {}) {
  return {
    extractBulletinFields: async () => ({
      studentQuery: 'Naya',
      subject: 'Mathématiques',
      grade: '85%',
      observations: null,
      tone: null,
    }),
    getStudentContext: async () => fictitiousContext(SAMPLE_TEMPLATE),
    fetchTemplatePdfBase64: failPdfFetch,
    generateBulletinComment: async () => ({ comment: 'Un commentaire suffisamment long pour être valide.' }),
    saveBulletinComment: async () => {},
    checkUsage: async () => ({ allowed: true }),
    refundUsage: async () => 0,
    ...overrides,
  }
}

test('looksLikeBulletinRequest reconnaît les formulations fr/en/es et ignore le reste', () => {
  assert.equal(looksLikeBulletinRequest('Rédige un commentaire de bulletin pour Naya'), true)
  assert.equal(looksLikeBulletinRequest('Write a report card comment for Naya'), true)
  assert.equal(looksLikeBulletinRequest('Escribe un comentario de boletín para Naya'), true)
  assert.equal(looksLikeBulletinRequest('Génère le PAT de Naya'), false)
  assert.equal(looksLikeBulletinRequest('Bonjour, comment ça va ?'), false)
})

test('resolveBulletinExtraction exige élève + matière + note, et applique le ton par défaut', () => {
  assert.equal(resolveBulletinExtraction(emptyExtraction()), null)
  assert.equal(
    resolveBulletinExtraction({ ...emptyExtraction(), studentQuery: 'Naya', subject: 'Maths' }),
    null
  )

  const resolved = resolveBulletinExtraction({
    studentQuery: 'Naya',
    subject: 'Mathématiques',
    grade: '85%',
    observations: null,
    tone: null,
  })
  assert.deepEqual(resolved, {
    studentQuery: 'Naya',
    subject: 'Mathématiques',
    grade: '85%',
    observations: undefined,
    tone: 'bienveillant',
  })

  const withTone = resolveBulletinExtraction({
    studentQuery: 'Naya',
    subject: 'Mathématiques',
    grade: '85%',
    observations: 'Participe activement.',
    tone: 'factuel',
  })
  assert.equal(withTone?.tone, 'factuel')
  assert.equal(withTone?.observations, 'Participe activement.')
})

test('extraction invalide ou incomplète : aucune génération, aucun appel de quota, réponse null', async () => {
  let studentLookups = 0
  let usageCalls = 0
  let generationCalls = 0

  const dependencies = baseDependencies({
    extractBulletinFields: async () => ({ not: 'a valid extraction shape' }),
    getStudentContext: async () => {
      studentLookups += 1
      return fictitiousContext(SAMPLE_TEMPLATE)
    },
    checkUsage: async () => {
      usageCalls += 1
      return { allowed: true }
    },
    generateBulletinComment: async () => {
      generationCalls += 1
      return { comment: 'x'.repeat(60) }
    },
  })

  const invalidShapeResult = await orchestrateBulletinRequest(
    { message: 'peu importe', trustedUserId: USER_ID },
    dependencies
  )
  assert.equal(invalidShapeResult, null)

  const incompleteResult = await orchestrateBulletinRequest(
    { message: 'Rédige un commentaire de bulletin pour Naya', trustedUserId: USER_ID },
    {
      ...dependencies,
      extractBulletinFields: async () => ({
        studentQuery: 'Naya',
        subject: null,
        grade: null,
        observations: null,
        tone: null,
      }),
    }
  )
  assert.equal(incompleteResult, null)

  assert.equal(studentLookups, 0)
  assert.equal(usageCalls, 0)
  assert.equal(generationCalls, 0)
})

test('élève ambigu ou introuvable : réponse structurée dédiée, sans génération ni quota', async () => {
  const ambiguous = await orchestrateBulletinRequest(
    { message: 'Bulletin pour Naya', trustedUserId: USER_ID },
    baseDependencies({
      getStudentContext: async () => ({
        kind: 'ambiguous',
        candidates: [
          { id: STUDENT_ID, firstName: 'Naya', lastName: 'Dorel', fullName: 'Naya Dorel', classes: [] },
          { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', firstName: 'Naya', lastName: 'Ali', fullName: 'Naya Ali', classes: [] },
        ],
      }),
    })
  )
  assert.equal(ambiguous?.kind, 'clarification')

  const notFound = await orchestrateBulletinRequest(
    { message: 'Bulletin pour Inconnu', trustedUserId: USER_ID },
    baseDependencies({ getStudentContext: async () => null })
  )
  assert.equal(notFound?.kind, 'student_not_found')
})

test('sans modèle configuré sur la classe : blocage, aucun appel de génération ni de quota', async () => {
  let usageCalls = 0
  let generationCalls = 0

  const result = await orchestrateBulletinRequest(
    { message: 'Bulletin pour Naya', trustedUserId: USER_ID },
    baseDependencies({
      getStudentContext: async () => fictitiousContext(null),
      checkUsage: async () => {
        usageCalls += 1
        return { allowed: true }
      },
      generateBulletinComment: async () => {
        generationCalls += 1
        return { comment: 'x'.repeat(60) }
      },
    })
  )

  assert.equal(result?.kind, 'template_missing')
  assert.equal(usageCalls, 0)
  assert.equal(generationCalls, 0)
})

test('sans résultat et sans observation : blocage avant génération et quota', async () => {
  let usageCalls = 0
  let generationCalls = 0
  const empty = fictitiousContext(SAMPLE_TEMPLATE)
  empty.evaluationResults = []

  const result = await orchestrateBulletinRequest(
    { message: 'Bulletin pour Naya', trustedUserId: USER_ID, interfaceLanguage: 'fr' },
    baseDependencies({
      getStudentContext: async () => empty,
      checkUsage: async () => { usageCalls += 1; return { allowed: true } },
      generateBulletinComment: async () => { generationCalls += 1; return { comment: 'x'.repeat(60) } },
    })
  )

  assert.equal(result?.kind, 'student_data_missing')
  assert.equal(usageCalls, 0)
  assert.equal(generationCalls, 0)
})

test('un résultat de la classe sans observation autorise la génération et est transmis', async () => {
  let receivedResults = 0
  const result = await orchestrateBulletinRequest(
    { message: 'Bulletin pour Naya', trustedUserId: USER_ID },
    baseDependencies({
      generateBulletinComment: async ({ evaluationResults, studentObservations }) => {
        receivedResults = evaluationResults.length
        assert.equal(studentObservations.length, 0)
        return { comment: 'Naya mobilise ses acquis avec sérieux et poursuit ses progrès avec régularité.' }
      },
    })
  )
  assert.equal(result?.kind, 'bulletin')
  assert.equal(receivedResults, 1)
})

test('une observation sans résultat autorise la génération et est transmise', async () => {
  const context = fictitiousContext(SAMPLE_TEMPLATE)
  context.evaluationResults = []
  context.observations = [{
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    sessionId: null,
    category: 'progress',
    tag: 'Progression fictive',
    note: 'Mobilise les stratégies travaillées.',
    createdAt: '2026-02-11T10:00:00.000Z',
  }]
  let receivedObservations = 0
  const result = await orchestrateBulletinRequest(
    { message: 'Bulletin pour Naya', trustedUserId: USER_ID },
    baseDependencies({
      getStudentContext: async () => context,
      generateBulletinComment: async ({ evaluationResults, studentObservations }) => {
        assert.equal(evaluationResults.length, 0)
        receivedObservations = studentObservations.length
        return { comment: 'Naya mobilise ses stratégies avec sérieux et construit des acquis durables.' }
      },
    })
  )
  assert.equal(result?.kind, 'bulletin')
  assert.equal(receivedObservations, 1)
})

test('un résultat appartenant à une autre classe ne permet pas la génération', async () => {
  let usageCalls = 0
  const context = fictitiousContext(SAMPLE_TEMPLATE)
  context.evaluationResults[0]!.classId = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
  const result = await orchestrateBulletinRequest(
    { message: 'Bulletin pour Naya', trustedUserId: USER_ID },
    baseDependencies({
      getStudentContext: async () => context,
      checkUsage: async () => { usageCalls += 1; return { allowed: true } },
    })
  )
  assert.equal(result?.kind, 'student_data_missing')
  assert.equal(usageCalls, 0)
})

test('avec un modèle texte configuré : génération, enregistrement avec le bon class_id, une seule charge de quota', async () => {
  let usageCalls = 0
  const savedRecords: BulletinCommentRecord[] = []
  const receivedTemplates: ResolvedDocumentTemplate[] = []

  const result = await orchestrateBulletinRequest(
    { message: 'Rédige un commentaire de bulletin : Naya, maths, 85%', trustedUserId: USER_ID },
    baseDependencies({
      checkUsage: async () => {
        usageCalls += 1
        return { allowed: true }
      },
      generateBulletinComment: async ({ documentTemplate }) => {
        receivedTemplates.push(documentTemplate)
        return { comment: 'Naya progresse avec sérieux et régularité en mathématiques ce trimestre.' }
      },
      saveBulletinComment: async (record) => {
        savedRecords.push(record)
      },
    })
  )

  assert.equal(result?.kind, 'bulletin')
  if (result?.kind === 'bulletin') {
    assert.equal(result.studentId, STUDENT_ID)
    assert.equal(result.subject, 'Mathématiques')
    assert.equal(result.grade, '85%')
  }
  assert.equal(usageCalls, 1)
  assert.deepEqual(receivedTemplates[0], { kind: 'text', content: SAMPLE_TEMPLATE })
  assert.equal(savedRecords[0]?.classId, CLASS_ID)
  assert.equal(savedRecords[0]?.studentId, STUDENT_ID)
})

test('avec un modèle PDF configuré : le PDF est lu et transmis en pièce jointe à la génération', async () => {
  const receivedTemplates: ResolvedDocumentTemplate[] = []
  const fetchedPaths: string[] = []

  const result = await orchestrateBulletinRequest(
    { message: 'Rédige un commentaire de bulletin : Naya, maths, 85%', trustedUserId: USER_ID },
    baseDependencies({
      getStudentContext: async () => fictitiousContext(null, 'user-1/bbbbbbbb.pdf'),
      fetchTemplatePdfBase64: async (path) => {
        fetchedPaths.push(path)
        return 'ZmFrZS1wZGYtY29udGVudA=='
      },
      generateBulletinComment: async ({ documentTemplate }) => {
        receivedTemplates.push(documentTemplate)
        return { comment: 'Naya progresse avec sérieux et régularité en mathématiques ce trimestre.' }
      },
    })
  )

  assert.equal(result?.kind, 'bulletin')
  assert.deepEqual(fetchedPaths, ['user-1/bbbbbbbb.pdf'])
  assert.deepEqual(receivedTemplates[0], { kind: 'pdf', base64: 'ZmFrZS1wZGYtY29udGVudA==' })
})

test('échec de génération : remboursement exactement une fois, quota déjà débité une fois', async () => {
  let refundCalls = 0
  let usageCalls = 0

  await assert.rejects(
    () =>
      orchestrateBulletinRequest(
        { message: 'Bulletin pour Naya', trustedUserId: USER_ID },
        baseDependencies({
          checkUsage: async () => {
            usageCalls += 1
            return { allowed: true }
          },
          generateBulletinComment: async () => {
            throw new Error('échec simulé')
          },
          refundUsage: async () => {
            refundCalls += 1
          },
        })
      ),
    (error: unknown) =>
      error instanceof BulletinOrchestrationError && error.code === 'BULLETIN_GENERATION_FAILED'
  )

  assert.equal(usageCalls, 1)
  assert.equal(refundCalls, 1)
})

test('quota dépassé : aucune génération tentée', async () => {
  let generationCalls = 0

  await assert.rejects(
    () =>
      orchestrateBulletinRequest(
        { message: 'Bulletin pour Naya', trustedUserId: USER_ID },
        baseDependencies({
          checkUsage: async () => ({ allowed: false }),
          generateBulletinComment: async () => {
            generationCalls += 1
            return { comment: 'x'.repeat(60) }
          },
        })
      ),
    (error: unknown) =>
      error instanceof BulletinOrchestrationError && error.code === 'BULLETIN_QUOTA_EXCEEDED'
  )

  assert.equal(generationCalls, 0)
})
