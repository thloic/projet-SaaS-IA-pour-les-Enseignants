import { patMock } from '../mocks/patMock.ts'
import type { PAT } from '../schemas/patSchema.ts'
import type { StudentContext } from '../types/memory.types.ts'
import { buildPATPrompt } from './patPrompt.ts'
import { parseAndValidatePAT } from './patValidation.ts'

export interface GeneratePATInput {
  studentContext: StudentContext
}

export type PATGenerationMode = 'mock' | 'real'
export type StructuredPATGenerator = (prompt: string) => Promise<unknown>

export function getPATGenerationMode(): PATGenerationMode {
  const mode = process.env.PAT_GENERATION_MODE ?? 'mock'
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
  const output = await generator(buildPATPrompt(input.studentContext))
  return groundGeneratedPAT(output, input.studentContext)
}

export async function generatePAT({ studentContext }: GeneratePATInput): Promise<PAT> {
  const mode = getPATGenerationMode()
  if (mode === 'mock') {
    return parseAndValidatePAT(structuredClone(patMock))
  }

  const { generateStructuredPATWithAnthropic } = await import('./patModel.ts')
  return generateRealPAT({ studentContext }, generateStructuredPATWithAnthropic)
}
