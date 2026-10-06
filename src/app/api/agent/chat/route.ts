import { streamText } from 'ai'
import { getCurrentUserAnthropicModel } from '@/features/ai/server/aiProviderResolver'
import { recordCurrentUserAIUsage } from '@/features/ai/server/aiUsageRecorder'
import { NextResponse } from 'next/server'
import { checkAndIncrementUsage, decrementUsage } from '@/features/billing/server/usage'
import { AGENT_LIMIT_REACHED_MESSAGES } from '@/features/billing/upgradeMessages'
import {
  agentChatRequestSchema,
  agentStructuredResponseSchema,
} from '@/features/agent/schemas/agentSchema'
import { generatePAT } from '@/features/agent/server/generatePAT'
import { getStudentContext, listOwnedStudents, saveStudentObservation } from '@/features/agent/server/memory'
import { resolveConversationContext } from '@/features/agent/server/conversationContext'
import { getClassContext, listOwnedClasses } from '@/features/agent/server/classContext'
import {
  orchestratePATRequest,
  PATOrchestrationError,
} from '@/features/agent/server/patOrchestration'
import { detectPATIntent } from '@/features/agent/server/patIntent'
import { detectFollowUpPlanIntent } from '@/features/agent/server/followUpPlanIntent'
import { generateFollowUpPlan } from '@/features/agent/server/generateFollowUpPlan'
import {
  orchestrateFollowUpPlanRequest,
  FollowUpPlanOrchestrationError,
} from '@/features/agent/server/followUpPlanOrchestration'
import { detectFollowUpPlanReviewIntent } from '@/features/agent/server/followUpPlanReviewIntent'
import { generateFollowUpPlanReview } from '@/features/agent/server/generateFollowUpPlanReview'
import {
  orchestrateFollowUpPlanReviewRequest,
  FollowUpPlanReviewOrchestrationError,
} from '@/features/agent/server/followUpPlanReviewOrchestration'
import {
  saveNewFollowUpPlan,
  getActiveFollowUpPlanForStudent,
  updateActiveFollowUpPlanForStudent,
} from '@/features/agent/server/followUpPlanRepository'
import { looksLikeBulletinRequest } from '@/features/agent/server/bulletinIntent'
import { extractBulletinFieldsWithAnthropic } from '@/features/agent/server/bulletinExtractionModel'
import {
  orchestrateBulletinRequest,
  BulletinOrchestrationError,
} from '@/features/agent/server/bulletinOrchestration'
import { generateBulletinComment as generateBulletinCommentService } from '@/features/bulletin/server/bulletinGeneration.service'
import { saveAgentBulletinComment } from '@/features/bulletin/server/bulletin.actions'
import { downloadClassTemplatePdfBase64 } from '@/features/classroom/server/documentTemplateStorage'
import { buildAgentSystemPrompt } from '@/lib/prompts/agent'
import { getCurrentTeacherProfile, getCurrentUser } from '@/features/profile/server/profile'
import {
  findLatestGeneratedDocument,
  saveAgentPATGeneration,
} from '@/features/generated-documents/server/generatedDocuments'
import { looksLikeDocumentModificationRequest } from '@/features/agent/server/documentModificationIntent'
import { extractDocumentModificationFieldsWithAnthropic } from '@/features/agent/server/documentModificationExtractionModel'
import {
  DocumentModificationError,
  orchestrateDocumentModification,
} from '@/features/agent/server/documentModificationOrchestration'
import { orchestrateStudentObservation } from '@/features/agent/server/observationOrchestration'
import { looksLikeParentEmailRequest } from '@/features/agent/server/parentEmailIntent'
import { extractParentEmailFieldsWithAnthropic } from '@/features/agent/server/parentEmailExtractionModel'
import { generateParentEmailDraft } from '@/features/agent/server/generateParentEmailDraft'
import {
  orchestrateParentEmailRequest,
  ParentEmailOrchestrationError,
} from '@/features/agent/server/parentEmailOrchestration'
import { saveAgentParentEmailDraft } from '@/features/agent/server/parentEmailRepository'
import { looksLikeMeetingSummaryRequest } from '@/features/agent/server/meetingSummaryIntent'
import { extractMeetingSummaryFieldsWithAnthropic } from '@/features/agent/server/meetingSummaryExtractionModel'
import { generateMeetingSummary } from '@/features/agent/server/generateMeetingSummary'
import {
  orchestrateMeetingSummaryRequest,
  MeetingSummaryOrchestrationError,
} from '@/features/agent/server/meetingSummaryOrchestration'
import { saveAgentMeetingSummary } from '@/features/agent/server/meetingSummaryRepository'

const USAGE_FEATURE = 'agent'

const ROUTE_COPY = {
  fr: {
    limit: AGENT_LIMIT_REACHED_MESSAGES.fr,
    patFailed: 'Le PAT n’a pas pu être généré. Votre quota n’a pas été débité.',
    followUpPlanFailed: 'Le plan de suivi n’a pas pu être généré. Votre quota n’a pas été débité.',
    parentEmailFailed: 'Le courriel aux parents n’a pas pu être généré. Votre quota n’a pas été débité.',
    meetingSummaryFailed: 'Le compte rendu de rencontre n’a pas pu être généré. Votre quota n’a pas été débité.',
    followUpPlanReviewFailed: 'Le bilan de révision n’a pas pu être généré. Votre quota n’a pas été débité.',
    bulletinFailed: 'Le commentaire de bulletin n’a pas pu être généré. Votre quota n’a pas été débité.',
    modificationFailed: 'Le document n’a pas pu être modifié. Votre quota n’a pas été débité.',
    contextFailed: 'Impossible de charger les données de vos classes. Votre quota n’a pas été débité.',
    quotaFailed: 'Impossible de vérifier votre quota pour le moment.',
  },
  en: {
    limit: AGENT_LIMIT_REACHED_MESSAGES.en,
    patFailed: 'The support plan could not be generated. Your quota was not charged.',
    followUpPlanFailed: 'The follow-up plan could not be generated. Your quota was not charged.',
    parentEmailFailed: 'The parent email could not be generated. Your quota was not charged.',
    meetingSummaryFailed: 'The meeting summary could not be generated. Your quota was not charged.',
    followUpPlanReviewFailed: 'The review summary could not be generated. Your quota was not charged.',
    bulletinFailed: 'The report card comment could not be generated. Your quota was not charged.',
    modificationFailed: 'The document could not be modified. Your quota was not charged.',
    contextFailed: 'Your class data could not be loaded. Your quota was not charged.',
    quotaFailed: 'Your quota could not be checked right now.',
  },
  es: {
    limit: AGENT_LIMIT_REACHED_MESSAGES.es,
    patFailed: 'No se ha podido generar el PAT. No se ha descontado de tu cuota.',
    followUpPlanFailed: 'No se ha podido generar el plan de seguimiento. No se ha descontado de tu cuota.',
    parentEmailFailed: 'No se ha podido generar el correo a los padres. No se ha descontado de tu cuota.',
    meetingSummaryFailed: 'No se ha podido generar el resumen de la reunión. No se ha descontado de tu cuota.',
    followUpPlanReviewFailed: 'No se ha podido generar el balance de revisión. No se ha descontado de tu cuota.',
    bulletinFailed: 'No se ha podido generar el comentario de boletín. No se ha descontado de tu cuota.',
    modificationFailed: 'No se ha podido modificar el documento. No se ha descontado de tu cuota.',
    contextFailed: 'No se pudieron cargar los datos de tus clases. No se ha descontado de tu cuota.',
    quotaFailed: 'No se puede comprobar tu cuota en este momento.',
  },
} as const

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return jsonError('Vous devez être connecté pour utiliser l’agent.', 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('La demande est invalide.', 400)
  }

  const parsed = agentChatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Le message est invalide.', 400)
  }

  const profile = await getCurrentTeacherProfile()
  if (!profile) {
    return jsonError('Terminez votre profil enseignant avant d’utiliser l’agent.', 400)
  }
  const copy = ROUTE_COPY[profile.interface_language]

  const latestUserMessage = [...parsed.data.messages]
    .reverse()
    .find((message) => message.role === 'user')
  const patIntent = latestUserMessage ? detectPATIntent(latestUserMessage.content) : null
  const followUpPlanReviewIntent = latestUserMessage
    ? detectFollowUpPlanReviewIntent(latestUserMessage.content)
    : null
  const followUpPlanIntent =
    latestUserMessage && !followUpPlanReviewIntent
      ? detectFollowUpPlanIntent(latestUserMessage.content)
      : null
  const bulletinIntent = latestUserMessage
    ? looksLikeBulletinRequest(latestUserMessage.content)
    : false
  const parentEmailIntent = latestUserMessage
    ? looksLikeParentEmailRequest(latestUserMessage.content)
    : false
  const meetingSummaryIntent = latestUserMessage
    ? looksLikeMeetingSummaryRequest(latestUserMessage.content)
    : false
  const modificationIntent = latestUserMessage
    ? looksLikeDocumentModificationRequest(latestUserMessage.content)
    : false

  if (
    !modificationIntent &&
    !patIntent &&
    !followUpPlanReviewIntent &&
    !followUpPlanIntent &&
    !bulletinIntent &&
    !parentEmailIntent &&
    !meetingSummaryIntent &&
    latestUserMessage
  ) {
    try {
      const result = await orchestrateStudentObservation(
        {
          message: latestUserMessage.content,
          interfaceLanguage: profile.interface_language,
        },
        { listOwnedStudents, saveStudentObservation }
      )
      if (result) return NextResponse.json(agentStructuredResponseSchema.parse(result))
    } catch (error) {
      console.error('[agent:observation] enregistrement impossible', error)
      return jsonError(copy.contextFailed, 500)
    }
  }

  if (modificationIntent && latestUserMessage) {
    try {
      const result = await orchestrateDocumentModification(
        {
          message: latestUserMessage.content,
          trustedUserId: user.id,
          contentLanguage: profile.language,
          interfaceLanguage: profile.interface_language,
        },
        {
          extractModificationFields: extractDocumentModificationFieldsWithAnthropic,
          getStudentContext,
          findLatestDocument: findLatestGeneratedDocument,
          fetchTemplatePdfBase64: downloadClassTemplatePdfBase64,
          regeneratePAT: generatePAT,
          regenerateBulletinComment: ({
            studentContext,
            previousDocument,
            evaluationResults,
            studentObservations,
            documentTemplate,
            modificationInstruction,
          }) => generateBulletinCommentService({
            input: {
              student_name: studentContext.student.fullName,
              subject: previousDocument.subject,
              grade: previousDocument.grade,
              observations: previousDocument.observations,
              tone: previousDocument.tone,
            },
            teacherProfile: {
              subject: profile.subject,
              subjects: profile.subjects,
              gradingSystem: profile.grading_system,
              language: profile.language,
            },
            documentTemplate,
            evaluationResults,
            studentObservations,
            previousComment: previousDocument.comment,
            modificationInstruction,
          }),
          saveDocument: async (document) => {
            if (document.documentType === 'pat') {
              await saveAgentPATGeneration(document)
            } else {
              await saveAgentBulletinComment(document)
            }
          },
          checkUsage: async (userId) => checkAndIncrementUsage(userId, USAGE_FEATURE),
          refundUsage: async (userId) => decrementUsage(userId, USAGE_FEATURE),
        }
      )
      if (result) return NextResponse.json(agentStructuredResponseSchema.parse(result))
    } catch (error) {
      if (
        error instanceof DocumentModificationError &&
        error.code === 'DOCUMENT_MODIFICATION_QUOTA_EXCEEDED'
      ) {
        return jsonError(copy.limit, 403)
      }
      console.error('[agent:document-modification] echec de la modification structuree', error)
      return jsonError(copy.modificationFailed, 500)
    }
  }

  if (!modificationIntent && patIntent) {
    try {
      const result = await orchestratePATRequest(
        {
          studentQuery: patIntent.studentQuery,
          trustedUserId: user.id,
          contentLanguage: profile.language,
          interfaceLanguage: profile.interface_language,
        },
        {
          getStudentContext,
          fetchTemplatePdfBase64: downloadClassTemplatePdfBase64,
          generatePAT,
          savePAT: saveAgentPATGeneration,
          checkUsage: async (userId) => checkAndIncrementUsage(userId, USAGE_FEATURE),
          refundUsage: async (userId) => decrementUsage(userId, USAGE_FEATURE),
        }
      )
      return NextResponse.json(agentStructuredResponseSchema.parse(result))
    } catch (error) {
      if (error instanceof PATOrchestrationError && error.code === 'PAT_QUOTA_EXCEEDED') {
        return jsonError(copy.limit, 403)
      }
      console.error('[agent:pat] echec de la demande structuree', error)
      return jsonError(copy.patFailed, 500)
    }
  }

  if (!modificationIntent && !patIntent && followUpPlanReviewIntent) {
    try {
      const result = await orchestrateFollowUpPlanReviewRequest(
        {
          studentQuery: followUpPlanReviewIntent.studentQuery,
          trustedUserId: user.id,
          contentLanguage: profile.language,
          interfaceLanguage: profile.interface_language,
        },
        {
          getStudentContext,
          getActiveFollowUpPlan: async ({ studentId }) => {
            const active = await getActiveFollowUpPlanForStudent(studentId)
            return active?.record ?? null
          },
          generateFollowUpPlanReview,
          savePlan: (record, identity) => updateActiveFollowUpPlanForStudent(user.id, identity.studentId, record),
          checkUsage: async (userId) => checkAndIncrementUsage(userId, USAGE_FEATURE),
          refundUsage: async (userId) => decrementUsage(userId, USAGE_FEATURE),
        }
      )
      return NextResponse.json(agentStructuredResponseSchema.parse(result))
    } catch (error) {
      if (
        error instanceof FollowUpPlanReviewOrchestrationError &&
        error.code === 'FOLLOW_UP_PLAN_REVIEW_QUOTA_EXCEEDED'
      ) {
        return jsonError(copy.limit, 403)
      }
      console.error('[agent:follow-up-plan-review] echec de la demande structuree', error)
      return jsonError(copy.followUpPlanReviewFailed, 500)
    }
  }

  if (!modificationIntent && !patIntent && followUpPlanIntent) {
    try {
      const result = await orchestrateFollowUpPlanRequest(
        {
          studentQuery: followUpPlanIntent.studentQuery,
          trustedUserId: user.id,
          contentLanguage: profile.language,
          interfaceLanguage: profile.interface_language,
        },
        {
          getStudentContext,
          generateFollowUpPlan,
          savePlan: (record, identity) =>
            saveNewFollowUpPlan({ studentId: identity.studentId, classId: null, record }),
          checkUsage: async (userId) => checkAndIncrementUsage(userId, USAGE_FEATURE),
          refundUsage: async (userId) => decrementUsage(userId, USAGE_FEATURE),
        }
      )
      return NextResponse.json(agentStructuredResponseSchema.parse(result))
    } catch (error) {
      if (
        error instanceof FollowUpPlanOrchestrationError &&
        error.code === 'FOLLOW_UP_PLAN_QUOTA_EXCEEDED'
      ) {
        return jsonError(copy.limit, 403)
      }
      console.error('[agent:follow-up-plan] echec de la demande structuree', error)
      return jsonError(copy.followUpPlanFailed, 500)
    }
  }

  if (
    !modificationIntent &&
    !patIntent &&
    !followUpPlanReviewIntent &&
    !followUpPlanIntent &&
    !parentEmailIntent &&
    !meetingSummaryIntent &&
    latestUserMessage &&
    bulletinIntent
  ) {
    try {
      const result = await orchestrateBulletinRequest(
        {
          message: latestUserMessage.content,
          trustedUserId: user.id,
          interfaceLanguage: profile.interface_language,
        },
        {
          extractBulletinFields: extractBulletinFieldsWithAnthropic,
          getStudentContext,
          fetchTemplatePdfBase64: downloadClassTemplatePdfBase64,
          generateBulletinComment: ({ studentName, subject, grade, observations, tone, documentTemplate, evaluationResults, studentObservations }) =>
            generateBulletinCommentService({
              input: { student_name: studentName, subject, grade, observations, tone },
              teacherProfile: {
                subject: profile.subject,
                subjects: profile.subjects,
                gradingSystem: profile.grading_system,
                language: profile.language,
              },
              documentTemplate,
              evaluationResults,
              studentObservations,
            }),
          saveBulletinComment: saveAgentBulletinComment,
          checkUsage: async (userId) => checkAndIncrementUsage(userId, USAGE_FEATURE),
          refundUsage: async (userId) => decrementUsage(userId, USAGE_FEATURE),
        }
      )
      // result === null : le message ressemblait a une demande de bulletin
      // mais il manquait un champ indispensable (matiere/note) — on laisse la
      // conversation normale continuer pour que l'agent redemande l'info.
      if (result) {
        return NextResponse.json(agentStructuredResponseSchema.parse(result))
      }
    } catch (error) {
      if (error instanceof BulletinOrchestrationError && error.code === 'BULLETIN_QUOTA_EXCEEDED') {
        return jsonError(copy.limit, 403)
      }
      console.error('[agent:bulletin] echec de la demande structuree', error)
      return jsonError(copy.bulletinFailed, 500)
    }
  }

  if (
    !modificationIntent &&
    !patIntent &&
    !followUpPlanReviewIntent &&
    !followUpPlanIntent &&
    !meetingSummaryIntent &&
    latestUserMessage &&
    parentEmailIntent
  ) {
    console.log('[route:agent-chat] branche courriel parent declenchee', {
      message: latestUserMessage.content,
    })
    try {
      const result = await orchestrateParentEmailRequest(
        {
          message: latestUserMessage.content,
          trustedUserId: user.id,
          contentLanguage: profile.language,
          interfaceLanguage: profile.interface_language,
        },
        {
          extractParentEmailFields: extractParentEmailFieldsWithAnthropic,
          getStudentContext,
          generateParentEmailDraft,
          saveParentEmailDraft: saveAgentParentEmailDraft,
          checkUsage: async (userId) => checkAndIncrementUsage(userId, USAGE_FEATURE),
          refundUsage: async (userId) => decrementUsage(userId, USAGE_FEATURE),
        }
      )
      // result === null : le message ressemblait a une demande de courriel aux
      // parents mais il manquait l'eleve ou le motif — on laisse la
      // conversation normale continuer pour que l'agent redemande l'info.
      console.log('[route:agent-chat] resultat orchestration courriel parent', result ? result.kind : null)
      if (result) {
        const parsed = agentStructuredResponseSchema.safeParse(result)
        if (!parsed.success) {
          console.error('[route:agent-chat] reponse courriel parent invalide contre le schema', parsed.error.issues, result)
          return jsonError(copy.parentEmailFailed, 500)
        }
        return NextResponse.json(parsed.data)
      }
    } catch (error) {
      console.error('[route:agent-chat] exception dans la branche courriel parent', error)
      if (
        error instanceof ParentEmailOrchestrationError &&
        error.code === 'PARENT_EMAIL_QUOTA_EXCEEDED'
      ) {
        return jsonError(copy.limit, 403)
      }
      console.error('[agent:parent-email] echec de la demande structuree', error)
      return jsonError(copy.parentEmailFailed, 500)
    }
  }

  if (
    !modificationIntent &&
    !patIntent &&
    !followUpPlanReviewIntent &&
    !followUpPlanIntent &&
    latestUserMessage &&
    meetingSummaryIntent
  ) {
    try {
      const result = await orchestrateMeetingSummaryRequest(
        {
          message: latestUserMessage.content,
          trustedUserId: user.id,
          contentLanguage: profile.language,
          interfaceLanguage: profile.interface_language,
        },
        {
          extractMeetingSummaryFields: extractMeetingSummaryFieldsWithAnthropic,
          getStudentContext,
          generateMeetingSummary,
          saveMeetingSummary: saveAgentMeetingSummary,
          checkUsage: async (userId) => checkAndIncrementUsage(userId, USAGE_FEATURE),
          refundUsage: async (userId) => decrementUsage(userId, USAGE_FEATURE),
        }
      )
      // result === null : le message ressemblait a une demande de compte rendu
      // de rencontre mais il manquait l'eleve ou des notes suffisantes — on
      // laisse la conversation normale continuer pour que l'agent redemande.
      if (result) {
        return NextResponse.json(agentStructuredResponseSchema.parse(result))
      }
    } catch (error) {
      if (
        error instanceof MeetingSummaryOrchestrationError &&
        error.code === 'MEETING_SUMMARY_QUOTA_EXCEEDED'
      ) {
        return jsonError(copy.limit, 403)
      }
      console.error('[agent:meeting-summary] echec de la demande structuree', error)
      return jsonError(copy.meetingSummaryFailed, 500)
    }
  }

  let context
  try {
    context = await resolveConversationContext(parsed.data.messages, profile.interface_language, {
      listOwnedClasses,
      listOwnedStudents,
      getStudentContext,
      getClassContext: (id) => getClassContext(id, profile.grading_system),
    })
    if (context.reply) return new Response(context.reply, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    if (context.clarification) return NextResponse.json(agentStructuredResponseSchema.parse(context.clarification))
  } catch (error) {
    console.error('[agent:context] chargement impossible', error)
    return jsonError(copy.contextFailed, 500)
  }

  let usage
  try {
    usage = await checkAndIncrementUsage(user.id, USAGE_FEATURE)
  } catch (error) {
    console.error('[agent] verification du quota impossible', error)
    return jsonError(copy.quotaFailed, 500)
  }

  if (!usage.allowed) {
    return jsonError(copy.limit, 403)
  }

  const systemPrompt = buildAgentSystemPrompt(
    {
      subjects: profile.subjects,
      levels: profile.levels,
      country: profile.country,
      language: profile.language,
    },
    context.student,
    context.classroom
  )

  const encoder = new TextEncoder()
  let settled = false

  async function refundOnce() {
    if (settled) return
    settled = true
    await decrementUsage(user!.id, USAGE_FEATURE)
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const result = streamText({
          model: await getCurrentUserAnthropicModel('agent_chat'),
          system: systemPrompt,
          messages: parsed.data.messages,
          temperature: 0.4,
          maxOutputTokens: 2000,
          maxRetries: 1,
          timeout: 60000,
          abortSignal: request.signal,
        })

        let receivedAnyChunk = false
        for await (const chunk of result.textStream) {
          if (request.signal.aborted) {
            throw new Error('AGENT_CHAT_ABORTED')
          }
          receivedAnyChunk = true
          controller.enqueue(encoder.encode(chunk))
        }

        await recordCurrentUserAIUsage('agent_chat', 'agent', await result.usage)

        if (!receivedAnyChunk) {
          await refundOnce()
        }

        settled = true
        controller.close()
      } catch (error) {
        console.error('[agent] echec generation', error)
        await refundOnce()
        controller.error(error)
      }
    },
    async cancel() {
      await refundOnce()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  })
}
