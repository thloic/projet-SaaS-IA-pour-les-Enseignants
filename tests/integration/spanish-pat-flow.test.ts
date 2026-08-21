import assert from 'node:assert/strict'
import test from 'node:test'
import JSZip from 'jszip'

import { agentStructuredResponseSchema } from '../../src/features/agent/schemas/agentSchema.ts'
import type { PAT } from '../../src/features/agent/schemas/patSchema.ts'
import { generateRealPAT } from '../../src/features/agent/server/generatePAT.ts'
import { orchestratePATRequest } from '../../src/features/agent/server/patOrchestration.ts'
import type { StudentContext } from '../../src/features/agent/types/memory.types.ts'
import { exportPATToDocx } from '../../src/features/agent/utils/exportPATDocx.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const STUDENT_ID = '22222222-2222-4222-8222-222222222222'

const context: StudentContext = {
  kind: 'context',
  student: {
    id: STUDENT_ID,
    firstName: 'Lina',
    lastName: 'Soler',
    fullName: 'Lina Soler',
    sex: 'F',
    familyLanguage: 'es',
    needs: ['Consolidar la planificación de textos breves.'],
    institutionalAdaptations: ['Tiempo adicional', 'Reformulación de las instrucciones'],
    interventionPlan: false,
    generalNotes: 'Participa con constancia en las actividades orales.',
  },
  classes: [{
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Clase ficticia 2B',
    level: '2.º de secundaria',
    subject: 'Lengua',
    documentTemplate: 'Plantilla del docente: fortalezas, necesidades, intervenciones previstas.',
    documentTemplatePath: null,
  }],
  observations: [],
  participations: [],
  attendance: [],
  contentVariants: [],
}

const generatedPAT: PAT = {
  eleve: {
    nom: 'Nombre que debe sustituirse',
    niveau: 'Nivel que debe sustituirse',
    profil: 'Participa con constancia y utiliza adecuadamente los apoyos visuales.',
  },
  habiletes: {
    forces: ['Participa de forma activa en las actividades orales.'],
    besoins: ['Consolidar la planificación de textos breves.'],
  },
  comportementsCibles: [{
    habilete: 'Planificar un texto antes de redactarlo.',
    interventionsPrevues: 'Utilizar una plantilla con pasos breves y explícitos.',
  }],
  modalitesAppui: ['Acompañamiento breve al inicio de la actividad.'],
  adaptationsOffertes: ['Adaptación inventada que debe sustituirse'],
  recommandationsPSAC: 'Mantener apoyos estructurados y revisar los progresos periódicamente.',
}

test('demande espagnole → contexte isolé → PAT validé → aperçu structuré → DOCX espagnol', async () => {
  let prompt = ''
  const response = await orchestratePATRequest(
    {
      studentQuery: 'Lina',
      trustedUserId: USER_ID,
      contentLanguage: 'es',
      interfaceLanguage: 'es',
    },
    {
      getStudentContext: async () => context,
      fetchTemplatePdfBase64: async () => {
        throw new Error('Aucune lecture de PDF attendue pour un modèle texte')
      },
      generatePAT: ({ studentContext, language, documentTemplate }) =>
        generateRealPAT({ studentContext, language, documentTemplate }, async (receivedPrompt) => {
          prompt = receivedPrompt
          return generatedPAT
        }),
      checkUsage: async () => ({ allowed: true }),
      refundUsage: async () => 0,
    }
  )

  const structured = agentStructuredResponseSchema.parse(response)
  assert.equal(structured.kind, 'pat')
  if (structured.kind !== 'pat') return

  assert.equal(structured.language, 'es')
  assert.equal(structured.pat.eleve.nom, 'Lina Soler')
  assert.equal(structured.pat.eleve.niveau, '2.º de secundaria')
  assert.deepEqual(structured.pat.adaptationsOffertes, context.student.institutionalAdaptations)
  assert.match(prompt, /espagnol international/i)

  const archive = await JSZip.loadAsync(
    await exportPATToDocx(structured.pat, { language: structured.language })
  )
  const documentXml = await archive.file('word/document.xml')?.async('string')
  assert.ok(documentXml)
  assert.match(documentXml, /Plan temporal de apoyo/)
  assert.match(documentXml, /Lina Soler/)
  assert.match(documentXml, /Adaptaciones ofrecidas/)
})
