import assert from 'node:assert/strict'
import test from 'node:test'

import { patMock } from '../../src/features/agent/mocks/patMock.ts'
import { looksLikeDocumentModificationRequest } from '../../src/features/agent/server/documentModificationIntent.ts'
import { resolveDocumentModification } from '../../src/features/agent/schemas/documentModificationSchema.ts'
import {
  DocumentModificationError,
  orchestrateDocumentModification,
} from '../../src/features/agent/server/documentModificationOrchestration.ts'
import type { StudentContext } from '../../src/features/agent/types/memory.types.ts'
import type { StoredGeneratedDocument } from '../../src/features/generated-documents/types/generatedDocument.types.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const STUDENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const CLASS_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function context(): StudentContext {
  return {
    kind: 'context',
    student: {
      id: STUDENT_ID,
      firstName: 'Nora',
      lastName: 'Valen',
      fullName: 'Nora Valen',
      sex: 'F',
      familyLanguage: 'fr',
      needs: ['Consolider la planification des textes.'],
      institutionalAdaptations: ['Temps supplémentaire'],
      interventionPlan: true,
      generalNotes: 'Utilise les supports visuels avec autonomie.',
    },
    classes: [{
      id: CLASS_ID,
      name: 'Classe fictive 8D',
      level: '8e année',
      subject: 'Français',
      documentTemplate: 'Modèle fictif de l’établissement.',
      documentTemplatePath: null,
    }],
    observations: [{
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', sessionId: null, category: 'progress',
      tag: 'Progression fictive', note: 'Planifie plus spontanément.', createdAt: '2026-03-02T12:00:00.000Z',
    }],
    participations: [],
    attendance: [],
    contentVariants: [],
    evaluationResults: [],
  }
}

const previousPAT: StoredGeneratedDocument = {
  documentType: 'pat', id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', studentId: STUDENT_ID,
  classId: CLASS_ID, language: 'fr', pat: structuredClone(patMock), createdAt: '2026-03-01T12:00:00.000Z',
}

function dependencies(overrides: Partial<Parameters<typeof orchestrateDocumentModification>[1]> = {}) {
  return {
    extractModificationFields: async () => ({ studentQuery: 'Nora', documentType: 'pat' as const, instruction: 'Rends la recommandation plus concise.' }),
    getStudentContext: async () => context(),
    findLatestDocument: async () => previousPAT,
    fetchTemplatePdfBase64: async () => { throw new Error('Aucun PDF attendu') },
    regeneratePAT: async () => structuredClone(patMock),
    regenerateBulletinComment: async () => ({ comment: 'Nora mobilise ses acquis avec sérieux. Elle participe régulièrement. La planification constitue son prochain axe de progression.' }),
    saveDocument: async () => {},
    checkUsage: async () => ({ allowed: true }),
    refundUsage: async () => 0,
    ...overrides,
  }
}

test('le filtre reconnaît les demandes de modification FR/EN/ES sans confondre une génération', () => {
  assert.equal(looksLikeDocumentModificationRequest('Modifie le PAT de Nora'), true)
  assert.equal(looksLikeDocumentModificationRequest('Edit Nora report card'), true)
  assert.equal(looksLikeDocumentModificationRequest('Cambia el PAT de Nora'), true)
  assert.equal(looksLikeDocumentModificationRequest('Génère le PAT de Nora'), false)
})

test('une extraction incomplète retombe sur le chat normal sans lookup ni quota', async () => {
  assert.equal(resolveDocumentModification({ studentQuery: 'Nora', documentType: null, instruction: 'Change le ton' }), null)
  let lookupCalls = 0
  let usageCalls = 0
  const result = await orchestrateDocumentModification(
    { message: 'Modifie le document de Nora', trustedUserId: USER_ID },
    dependencies({
      extractModificationFields: async () => ({ studentQuery: 'Nora', documentType: null, instruction: 'Change le ton' }),
      getStudentContext: async () => { lookupCalls += 1; return context() },
      checkUsage: async () => { usageCalls += 1; return { allowed: true } },
    })
  )
  assert.equal(result, null)
  assert.equal(lookupCalls, 0)
  assert.equal(usageCalls, 0)
})

test('sans document antérieur : réponse dédiée, aucune génération ni quota', async () => {
  let generationCalls = 0
  let usageCalls = 0
  const result = await orchestrateDocumentModification(
    { message: 'Modifie le PAT de Nora', trustedUserId: USER_ID, interfaceLanguage: 'fr' },
    dependencies({
      findLatestDocument: async () => null,
      regeneratePAT: async () => { generationCalls += 1; return patMock },
      checkUsage: async () => { usageCalls += 1; return { allowed: true } },
    })
  )
  assert.equal(result?.kind, 'document_not_found_for_modification')
  assert.equal(generationCalls, 0)
  assert.equal(usageCalls, 0)
})

test('le document le plus récent est régénéré et sauvegardé comme une nouvelle entrée', async () => {
  const older = { ...previousPAT, id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', createdAt: '2026-02-01T12:00:00.000Z' }
  const newest = structuredClone(previousPAT)
  newest.pat.recommandationsPSAC = 'Version la plus récente.'
  const available = [older, newest].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const saved: unknown[] = []
  let receivedPrevious = ''
  let usageCalls = 0

  const result = await orchestrateDocumentModification(
    { message: 'Modifie le PAT de Nora', trustedUserId: USER_ID },
    dependencies({
      findLatestDocument: async () => available[0],
      regeneratePAT: async ({ previousPat }) => {
        receivedPrevious = previousPat.recommandationsPSAC ?? ''
        return { ...structuredClone(previousPat), recommandationsPSAC: 'Version modifiée et concise.' }
      },
      saveDocument: async (document) => { saved.push(document) },
      checkUsage: async () => { usageCalls += 1; return { allowed: true } },
    })
  )

  assert.equal(result?.kind, 'pat')
  assert.equal(receivedPrevious, 'Version la plus récente.')
  assert.equal(saved.length, 1)
  assert.equal(usageCalls, 1)
  assert.equal(newest.pat.recommandationsPSAC, 'Version la plus récente.')
})

test('une modification de bulletin conserve ses métadonnées et crée une nouvelle entrée', async () => {
  const previousBulletin: StoredGeneratedDocument = {
    documentType: 'bulletin', id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', studentId: STUDENT_ID,
    studentName: 'Nora Valen', classId: CLASS_ID, subject: 'Français', grade: '16/20',
    tone: 'bienveillant', comment: 'Commentaire précédent suffisamment documenté.', createdAt: '2026-03-03T12:00:00.000Z',
  }
  const saved: unknown[] = []
  const result = await orchestrateDocumentModification(
    { message: 'Corrige le bulletin de Nora', trustedUserId: USER_ID },
    dependencies({
      extractModificationFields: async () => ({ studentQuery: 'Nora', documentType: 'bulletin', instruction: 'Rends le ton plus factuel.' }),
      findLatestDocument: async () => previousBulletin,
      saveDocument: async (document) => { saved.push(document) },
    })
  )
  assert.equal(result?.kind, 'bulletin')
  assert.equal(saved.length, 1)
  const savedBulletin = saved[0] as { documentType: string; grade: string; subject: string }
  assert.equal(savedBulletin.documentType, 'bulletin')
  assert.equal(savedBulletin.grade, '16/20')
  assert.equal(savedBulletin.subject, 'Français')
})

test('un échec de régénération rembourse le quota exactement une fois', async () => {
  let refunds = 0
  await assert.rejects(
    () => orchestrateDocumentModification(
      { message: 'Modifie le PAT de Nora', trustedUserId: USER_ID },
      dependencies({
        regeneratePAT: async () => { throw new Error('Échec simulé') },
        refundUsage: async () => { refunds += 1 },
      })
    ),
    (error: unknown) => error instanceof DocumentModificationError && error.code === 'DOCUMENT_MODIFICATION_FAILED'
  )
  assert.equal(refunds, 1)
})
