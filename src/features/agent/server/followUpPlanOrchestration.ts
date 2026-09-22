import type { AgentStructuredResponse } from '../schemas/agentSchema.ts'
import type { StudentContextResult } from '../types/memory.types.ts'
import type { FollowUpPlan } from '../schemas/followUpPlanSchema.ts'
import type { AppLocale, ContentLanguage } from '@/features/i18n/locale'
import {
  buildClarificationResponse,
  buildStudentDataMissingResponse,
  buildStudentNotFoundResponse,
} from './agentResponses.ts'

const FOLLOW_UP_PLAN_DOCUMENT_LABEL = {
  fr: 'un brouillon de plan de suivi',
  en: 'a follow-up plan draft',
  es: 'un borrador de plan de seguimiento',
}

export type FollowUpPlanOrchestrationErrorCode =
  | 'FOLLOW_UP_PLAN_QUOTA_EXCEEDED'
  | 'FOLLOW_UP_PLAN_GENERATION_FAILED'

export class FollowUpPlanOrchestrationError extends Error {
  readonly code: FollowUpPlanOrchestrationErrorCode

  constructor(code: FollowUpPlanOrchestrationErrorCode) {
    super(code)
    this.name = 'FollowUpPlanOrchestrationError'
    this.code = code
  }
}

export interface FollowUpPlanOrchestrationDependencies {
  getStudentContext(input: { studentQuery: string }): Promise<StudentContextResult>
  generateFollowUpPlan(input: {
    studentContext: Extract<StudentContextResult, { kind: 'context' }>
    language?: ContentLanguage
  }): Promise<FollowUpPlan>
  checkUsage(userId: string): Promise<{ allowed: boolean }>
  refundUsage(userId: string): Promise<unknown>
}

// Un brouillon de plan de suivi n'a de sens que s'il peut s'ancrer sur au moins
// une observation ou une adaptation deja connue — sinon on bloque explicitement
// plutot que de laisser l'IA halluciner un contenu (regle produit anti-hallucination).
function hasFollowUpPlanEvidence(context: Extract<StudentContextResult, { kind: 'context' }>): boolean {
  return context.observations.length > 0 || context.student.institutionalAdaptations.length > 0
}

function buildFollowUpPlanMessage(plan: FollowUpPlan): string {
  const lines = plan.items.map(
    (item, index) =>
      `${index + 1}. ${item.source}\n   Constat : ${item.constat}\n   Objectif : ${item.objectif}\n   Prochaine étape : ${item.prochaineEtape}`
  )
  return [`Brouillon de plan de suivi pour ${plan.eleve.nom}, à relire et ajuster avant de le conserver :`, '', ...lines].join('\n')
}

export async function orchestrateFollowUpPlanRequest(
  input: {
    studentQuery: string
    trustedUserId: string
    contentLanguage?: ContentLanguage
    interfaceLanguage?: AppLocale
  },
  dependencies: FollowUpPlanOrchestrationDependencies
): Promise<AgentStructuredResponse> {
  const context = await dependencies.getStudentContext({ studentQuery: input.studentQuery })

  if (context === null) {
    return buildStudentNotFoundResponse(input.studentQuery, input.interfaceLanguage)
  }

  if (context.kind === 'ambiguous') {
    return buildClarificationResponse(context.candidates, input.interfaceLanguage)
  }

  if (!hasFollowUpPlanEvidence(context)) {
    return buildStudentDataMissingResponse(
      context.student.fullName,
      FOLLOW_UP_PLAN_DOCUMENT_LABEL,
      input.interfaceLanguage
    )
  }

  const usage = await dependencies.checkUsage(input.trustedUserId)
  if (!usage.allowed) throw new FollowUpPlanOrchestrationError('FOLLOW_UP_PLAN_QUOTA_EXCEEDED')

  try {
    const language = input.contentLanguage ?? 'fr'
    const plan = await dependencies.generateFollowUpPlan({ studentContext: context, language })
    return {
      kind: 'follow_up_plan',
      studentId: context.student.id,
      message: buildFollowUpPlanMessage(plan),
      items: plan.items,
    }
  } catch (error) {
    console.error('[agent:follow-up-plan] echec de la generation', error)
    try {
      await dependencies.refundUsage(input.trustedUserId)
    } catch {
      // Le remboursement ne doit pas masquer l'erreur de génération initiale.
    }
    throw new FollowUpPlanOrchestrationError('FOLLOW_UP_PLAN_GENERATION_FAILED')
  }
}
