import type { AgentStructuredResponse } from '../schemas/agentSchema.ts'
import type { AppLocale } from '@/features/i18n/locale'
import type { OwnedStudentRecord, StudentObservationContext } from '../types/memory.types.ts'
import { detectMentionedStudent } from './studentMentionDetection.ts'
import { buildClarificationResponse } from './agentResponses.ts'
import { extractObservationContent, looksLikeStudentObservation } from './observationIntent.ts'

interface Dependencies {
  listOwnedStudents(): Promise<OwnedStudentRecord[]>
  saveStudentObservation(input: {
    studentId: string
    contenu: string
  }): Promise<StudentObservationContext>
}

const SAVED_COPY: Record<AppLocale, (name: string) => string> = {
  fr: (name) => `Observation enregistrée dans le dossier de ${name}.`,
  en: (name) => `The observation was saved in ${name}’s record.`,
  es: (name) => `La observación se guardó en el expediente de ${name}.`,
}

export async function orchestrateStudentObservation(
  input: { message: string; interfaceLanguage: AppLocale },
  dependencies: Dependencies
): Promise<AgentStructuredResponse | null> {
  if (!looksLikeStudentObservation(input.message)) return null

  const students = await dependencies.listOwnedStudents()
  const mention = detectMentionedStudent(input.message, students)
  if (mention.kind === 'none') return null
  if (mention.kind === 'ambiguous') {
    return buildClarificationResponse(mention.candidates, input.interfaceLanguage)
  }

  const contenu = extractObservationContent(input.message)
  if (!contenu) return null

  await dependencies.saveStudentObservation({
    studentId: mention.student.id,
    contenu,
  })

  return {
    kind: 'observation_saved',
    studentId: mention.student.id,
    message: SAVED_COPY[input.interfaceLanguage](mention.student.fullName),
  }
}
