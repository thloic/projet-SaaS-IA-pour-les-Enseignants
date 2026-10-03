import type { AgentStructuredResponse } from '../schemas/agentSchema.ts'
import type { StudentContextResult } from '../types/memory.types.ts'
import type { MeetingSummaryDraft } from '../schemas/meetingSummarySchema.ts'
import {
  meetingSummaryExtractionSchema,
  resolveMeetingSummaryExtraction,
} from '../schemas/meetingSummaryIntentSchema.ts'
import type { AppLocale, ContentLanguage } from '@/features/i18n/locale'
import {
  buildClarificationResponse,
  buildStudentNotFoundResponse,
} from './agentResponses.ts'

export type MeetingSummaryOrchestrationErrorCode =
  | 'MEETING_SUMMARY_QUOTA_EXCEEDED'
  | 'MEETING_SUMMARY_GENERATION_FAILED'

export class MeetingSummaryOrchestrationError extends Error {
  readonly code: MeetingSummaryOrchestrationErrorCode

  constructor(code: MeetingSummaryOrchestrationErrorCode) {
    super(code)
    this.name = 'MeetingSummaryOrchestrationError'
    this.code = code
  }
}

export interface MeetingSummaryRecord {
  studentId: string
  studentName: string
  classId: string | null
  notes: string
  subjectsDiscussed: string[]
  agreementsReached: string[]
  nextSteps: string[]
}

export interface MeetingSummaryOrchestrationDependencies {
  extractMeetingSummaryFields(message: string): Promise<unknown>
  getStudentContext(input: { studentQuery: string }): Promise<StudentContextResult>
  generateMeetingSummary(input: {
    studentFullName: string
    notes: string
    language?: ContentLanguage
  }): Promise<MeetingSummaryDraft>
  saveMeetingSummary(record: MeetingSummaryRecord): Promise<{ id: string }>
  checkUsage(userId: string): Promise<{ allowed: boolean }>
  refundUsage(userId: string): Promise<unknown>
}

// Contrairement aux courriels parents, aucune verification d'ancrage sur des
// donnees de la base n'est necessaire ici : les notes de l'enseignant sont
// elles-memes la source de verite (meme logique que le champ "situation" des
// courriels, mais ici toujours presentes et toujours suffisantes des lors
// qu'elles passent le seuil de longueur de resolveMeetingSummaryExtraction).
export async function orchestrateMeetingSummaryRequest(
  input: {
    message: string
    trustedUserId: string
    contentLanguage?: ContentLanguage
    interfaceLanguage?: AppLocale
  },
  dependencies: MeetingSummaryOrchestrationDependencies
): Promise<AgentStructuredResponse | null> {
  const rawExtraction = await dependencies.extractMeetingSummaryFields(input.message)
  const parsedExtraction = meetingSummaryExtractionSchema.safeParse(rawExtraction)
  if (!parsedExtraction.success) return null

  const resolved = resolveMeetingSummaryExtraction(parsedExtraction.data)
  if (!resolved) return null

  const context = await dependencies.getStudentContext({ studentQuery: resolved.studentQuery })

  if (context === null) {
    return buildStudentNotFoundResponse(resolved.studentQuery, input.interfaceLanguage)
  }

  if (context.kind === 'ambiguous') {
    return buildClarificationResponse(context.candidates, input.interfaceLanguage)
  }

  const usage = await dependencies.checkUsage(input.trustedUserId)
  if (!usage.allowed) throw new MeetingSummaryOrchestrationError('MEETING_SUMMARY_QUOTA_EXCEEDED')

  try {
    const classId = context.classes[0]?.id ?? null
    const draft = await dependencies.generateMeetingSummary({
      studentFullName: context.student.fullName,
      notes: resolved.notes,
      language: input.contentLanguage,
    })

    const saved = await dependencies.saveMeetingSummary({
      studentId: context.student.id,
      studentName: context.student.fullName,
      classId,
      notes: resolved.notes,
      subjectsDiscussed: draft.subjectsDiscussed,
      agreementsReached: draft.agreementsReached,
      nextSteps: draft.nextSteps,
    })

    return {
      kind: 'meeting_summary',
      studentId: context.student.id,
      summaryId: saved.id,
      subjectsDiscussed: draft.subjectsDiscussed,
      agreementsReached: draft.agreementsReached,
      nextSteps: draft.nextSteps,
    }
  } catch (error) {
    console.error('[agent:meeting-summary] echec de la generation', error)
    try {
      await dependencies.refundUsage(input.trustedUserId)
    } catch {
      // Le remboursement ne doit pas masquer l'erreur de génération initiale.
    }
    throw new MeetingSummaryOrchestrationError('MEETING_SUMMARY_GENERATION_FAILED')
  }
}
