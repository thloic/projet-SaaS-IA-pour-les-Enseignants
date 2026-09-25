import type { AgentStructuredResponse } from '../schemas/agentSchema.ts'
import type { StudentContextResult } from '../types/memory.types.ts'
import type { FollowUpPlanRecord } from '../schemas/followUpPlanTrackingSchema.ts'
import type { AppLocale, ContentLanguage } from '@/features/i18n/locale'
import {
  buildClarificationResponse,
  buildFollowUpPlanReviewNotReadyResponse,
  buildStudentDataMissingResponse,
  buildStudentNotFoundResponse,
} from './agentResponses.ts'
import { closeFollowUpPlan, isFollowUpPlanReadyForReview } from './followUpPlanTracking.ts'

const FOLLOW_UP_PLAN_REVIEW_DOCUMENT_LABEL = {
  fr: 'un bilan de révision de plan de suivi',
  en: 'a follow-up plan review summary',
  es: 'un balance de revisión de plan de seguimiento',
}

export type FollowUpPlanReviewOrchestrationErrorCode =
  | 'FOLLOW_UP_PLAN_REVIEW_QUOTA_EXCEEDED'
  | 'FOLLOW_UP_PLAN_REVIEW_GENERATION_FAILED'

export class FollowUpPlanReviewOrchestrationError extends Error {
  readonly code: FollowUpPlanReviewOrchestrationErrorCode

  constructor(code: FollowUpPlanReviewOrchestrationErrorCode) {
    super(code)
    this.name = 'FollowUpPlanReviewOrchestrationError'
    this.code = code
  }
}

export interface FollowUpPlanReviewOrchestrationDependencies {
  getStudentContext(input: { studentQuery: string }): Promise<StudentContextResult>
  getActiveFollowUpPlan(input: { userId: string; studentId: string }): Promise<FollowUpPlanRecord | null>
  generateFollowUpPlanReview(input: {
    record: FollowUpPlanRecord
    language?: ContentLanguage
  }): Promise<{ bilan: string }>
  savePlan(record: FollowUpPlanRecord, identity: { studentId: string }): Promise<void>
  checkUsage(userId: string): Promise<{ allowed: boolean }>
  refundUsage(userId: string): Promise<unknown>
}

function buildFollowUpPlanReviewMessage(studentName: string, bilan: string): string {
  return `Bilan de révision du plan de suivi de ${studentName} :\n\n${bilan}`
}

export async function orchestrateFollowUpPlanReviewRequest(
  input: {
    studentQuery: string
    trustedUserId: string
    contentLanguage?: ContentLanguage
    interfaceLanguage?: AppLocale
  },
  dependencies: FollowUpPlanReviewOrchestrationDependencies
): Promise<AgentStructuredResponse> {
  const context = await dependencies.getStudentContext({ studentQuery: input.studentQuery })

  if (context === null) {
    return buildStudentNotFoundResponse(input.studentQuery, input.interfaceLanguage)
  }
  if (context.kind === 'ambiguous') {
    return buildClarificationResponse(context.candidates, input.interfaceLanguage)
  }

  const plan = await dependencies.getActiveFollowUpPlan({
    userId: input.trustedUserId,
    studentId: context.student.id,
  })
  if (!plan) {
    return buildStudentDataMissingResponse(
      context.student.fullName,
      FOLLOW_UP_PLAN_REVIEW_DOCUMENT_LABEL,
      input.interfaceLanguage
    )
  }
  if (!isFollowUpPlanReadyForReview(plan)) {
    return buildFollowUpPlanReviewNotReadyResponse(context.student.fullName, input.interfaceLanguage)
  }

  const usage = await dependencies.checkUsage(input.trustedUserId)
  if (!usage.allowed) throw new FollowUpPlanReviewOrchestrationError('FOLLOW_UP_PLAN_REVIEW_QUOTA_EXCEEDED')

  try {
    const language = input.contentLanguage ?? 'fr'
    const generated = await dependencies.generateFollowUpPlanReview({ record: plan, language })
    const closed = closeFollowUpPlan(plan, generated.bilan)
    await dependencies.savePlan(closed, { studentId: context.student.id })

    return {
      kind: 'follow_up_plan_review',
      studentId: context.student.id,
      message: buildFollowUpPlanReviewMessage(context.student.fullName, generated.bilan),
      bilan: generated.bilan,
    }
  } catch (error) {
    console.error('[agent:follow-up-plan-review] echec de la generation', error)
    try {
      await dependencies.refundUsage(input.trustedUserId)
    } catch {
      // Le remboursement ne doit pas masquer l'erreur de génération initiale.
    }
    throw new FollowUpPlanReviewOrchestrationError('FOLLOW_UP_PLAN_REVIEW_GENERATION_FAILED')
  }
}
