import assert from 'node:assert/strict'
import test from 'node:test'

import { agentStructuredResponseSchema } from '../../src/features/agent/schemas/agentSchema.ts'
import { patMock } from '../../src/features/agent/mocks/patMock.ts'
import { generateRealPAT } from '../../src/features/agent/server/generatePAT.ts'
import { orchestrateDocumentModification } from '../../src/features/agent/server/documentModificationOrchestration.ts'
import type { StudentContext } from '../../src/features/agent/types/memory.types.ts'
import type { NewGeneratedDocument } from '../../src/features/generated-documents/types/generatedDocument.types.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const STUDENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const CLASS_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const context: StudentContext = {
  kind: 'context',
  student: {
    id: STUDENT_ID, firstName: 'Inès', lastName: 'Marel', fullName: 'Inès Marel', sex: 'F',
    familyLanguage: 'fr', needs: ['Consolider la structuration des idées.'],
    institutionalAdaptations: ['Reformulation des consignes'], interventionPlan: true,
    generalNotes: 'S’appuie efficacement sur les organisateurs graphiques.',
  },
  classes: [{
    id: CLASS_ID, name: 'Classe fictive 7B', level: '7e année', subject: 'Français',
    documentTemplate: 'Modèle fictif : forces, besoins, interventions et suivi.', documentTemplatePath: null,
  }],
  observations: [{
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', sessionId: null, category: 'progress',
    tag: 'Progrès fictif', note: 'Structure mieux ses réponses.', createdAt: '2026-03-03T12:00:00.000Z',
  }],
  participations: [], attendance: [], contentVariants: [], evaluationResults: [],
}

test('demande de modification → version récente → validation PAT → nouvelle version structurée', async () => {
  let prompt = ''
  const saved: NewGeneratedDocument[] = []
  const response = await orchestrateDocumentModification(
    {
      message: 'Modifie le PAT d’Inès : rends la recommandation plus concise.',
      trustedUserId: USER_ID,
      contentLanguage: 'fr',
      interfaceLanguage: 'fr',
    },
    {
      extractModificationFields: async () => ({
        studentQuery: 'Inès', documentType: 'pat', instruction: 'Rends la recommandation plus concise.',
      }),
      getStudentContext: async () => context,
      findLatestDocument: async () => ({
        documentType: 'pat', id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', studentId: STUDENT_ID,
        classId: CLASS_ID, language: 'fr', pat: patMock, createdAt: '2026-03-01T12:00:00.000Z',
      }),
      fetchTemplatePdfBase64: async () => { throw new Error('Aucun PDF attendu') },
      regeneratePAT: ({ studentContext, language, documentTemplate, previousPat, modificationInstruction }) =>
        generateRealPAT(
          { studentContext, language, documentTemplate, previousPat, modificationInstruction },
          async (receivedPrompt) => {
            prompt = receivedPrompt
            return {
              ...structuredClone(patMock),
              recommandationsPSAC: 'Maintenir les appuis documentés et réviser leur effet après huit semaines.',
            }
          }
        ),
      regenerateBulletinComment: async () => { throw new Error('Aucun bulletin attendu') },
      saveDocument: async (document) => { saved.push(document) },
      checkUsage: async () => ({ allowed: true }),
      refundUsage: async () => 0,
    }
  )

  const structured = agentStructuredResponseSchema.parse(response)
  assert.equal(structured.kind, 'pat')
  assert.match(prompt, /DOCUMENT PRÉCÉDENT/)
  assert.match(prompt, /Rends la recommandation plus concise\./)
  assert.equal(saved.length, 1)
  assert.equal(saved[0]?.documentType, 'pat')
  if (saved[0]?.documentType === 'pat') {
    assert.equal(saved[0].pat.eleve.nom, 'Inès Marel')
    assert.deepEqual(saved[0].pat.adaptationsOffertes, ['Reformulation des consignes'])
  }
})
