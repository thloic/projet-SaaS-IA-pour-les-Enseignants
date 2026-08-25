import { patMock } from '../mocks/patMock.ts'
import type { PAT } from '../schemas/patSchema.ts'
import type { StudentContext } from '../types/memory.types.ts'
import type { ResolvedDocumentTemplate } from '../types/documentTemplate.types.ts'
import { buildPATPrompt } from './patPrompt.ts'
import { parseAndValidatePAT } from './patValidation.ts'
import type { ContentLanguage } from '@/features/i18n/locale'

export interface GeneratePATInput {
  studentContext: StudentContext
  language?: ContentLanguage
  documentTemplate: ResolvedDocumentTemplate
  previousPat?: PAT
  modificationInstruction?: string
}

export type PATGenerationMode = 'mock' | 'real'
export type StructuredPATGenerator = (
  prompt: string,
  attachment?: { base64: string; mediaType: string }
) => Promise<unknown>

export function getPATGenerationMode(): PATGenerationMode {
  const mode = process.env.PAT_GENERATION_MODE ?? 'real'
  if (mode === 'mock' || mode === 'real') return mode
  throw new Error('INVALID_PAT_GENERATION_MODE')
}

function supportsFrancisation(studentContext: StudentContext): boolean {
  const evidence = [
    studentContext.student.familyLanguage,
    ...studentContext.student.needs,
    studentContext.student.generalNotes,
  ]
    .join(' ')
    .toLocaleLowerCase('fr')

  return (
    studentContext.student.familyLanguage.toLocaleLowerCase('fr') !== 'fr' ||
    /(francisation|allophone|apprenant[^.]{0,30}langue|français langue)/u.test(evidence)
  )
}

export function groundGeneratedPAT(value: unknown, studentContext: StudentContext): PAT {
  const generated = parseAndValidatePAT(value)
  const levels = [...new Set(studentContext.classes.map(({ level }) => level.trim()).filter(Boolean))]
  const hasRecentEvidence =
    studentContext.observations.length > 0 ||
    studentContext.participations.length > 0 ||
    studentContext.attendance.length > 0
  const documentedDates = new Set([
    ...studentContext.observations.map(({ createdAt }) => createdAt.slice(0, 10)),
    ...studentContext.participations.map(({ createdAt }) => createdAt.slice(0, 10)),
    ...studentContext.attendance.map(({ updatedAt }) => updatedAt.slice(0, 10)),
  ])
  const hasProfileEvidence =
    studentContext.student.needs.length > 0 ||
    studentContext.student.generalNotes.trim().length > 0 ||
    studentContext.student.interventionPlan

  const grounded: PAT = {
    ...generated,
    eleve: {
      nom: studentContext.student.fullName,
      ...(levels.length > 0 ? { niveau: levels.join(', ') } : {}),
      ...(hasProfileEvidence && generated.eleve.profil
        ? { profil: generated.eleve.profil }
        : {}),
    },
    comportementsCibles: generated.comportementsCibles.map((target) => ({
      habilete: target.habilete,
      interventionsPrevues: target.interventionsPrevues,
      ...(target.date && documentedDates.has(target.date) ? { date: target.date } : {}),
      ...(hasRecentEvidence && target.preuvesProgression
        ? { preuvesProgression: target.preuvesProgression }
        : {}),
    })),
    adaptationsOffertes: [...studentContext.student.institutionalAdaptations],
    ...(!supportsFrancisation(studentContext) ? { francisation: undefined } : {}),
  }

  if (grounded.francisation === undefined) delete grounded.francisation
  return parseAndValidatePAT(grounded)
}

export async function generateRealPAT(
  input: GeneratePATInput,
  generator: StructuredPATGenerator
): Promise<PAT> {
  const prompt = buildPATPrompt(
    input.studentContext,
    input.documentTemplate,
    input.language ?? 'fr',
    {
      previousPat: input.previousPat,
      modificationInstruction: input.modificationInstruction,
    }
  )
  const attachment =
    input.documentTemplate.kind === 'pdf'
      ? { base64: input.documentTemplate.base64, mediaType: 'application/pdf' }
      : undefined
  const output = await generator(prompt, attachment)
  return groundGeneratedPAT(output, input.studentContext)
}

export async function generatePAT({
  studentContext,
  language = 'fr',
  documentTemplate,
  previousPat,
  modificationInstruction,
}: GeneratePATInput): Promise<PAT> {
  const mode = getPATGenerationMode()
  if (mode === 'mock') {
    return parseAndValidatePAT(structuredClone(patMock))
  }

  const { generateStructuredPATWithAnthropic } = await import('./patModel.ts')
  return generateRealPAT(
    { studentContext, language, documentTemplate, previousPat, modificationInstruction },
    generateStructuredPATWithAnthropic
  )
}
