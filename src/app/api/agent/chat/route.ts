import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { NextResponse } from 'next/server'
import { checkAndIncrementUsage, decrementUsage } from '@/features/billing/server/usage'
import { AGENT_LIMIT_REACHED_MESSAGES } from '@/features/billing/upgradeMessages'
import {
  agentChatRequestSchema,
  agentStructuredResponseSchema,
} from '@/features/agent/schemas/agentSchema'
import { generatePAT } from '@/features/agent/server/generatePAT'
import { getStudentContext, listOwnedStudents } from '@/features/agent/server/memory'
import { resolveConversationContext } from '@/features/agent/server/conversationContext'
import { getClassContext, listOwnedClasses } from '@/features/agent/server/classContext'
import {
  orchestratePATRequest,
  PATOrchestrationError,
} from '@/features/agent/server/patOrchestration'
import { detectPATIntent } from '@/features/agent/server/patIntent'
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

const USAGE_FEATURE = 'agent'

const ROUTE_COPY = {
  fr: {
    limit: AGENT_LIMIT_REACHED_MESSAGES.fr,
    patFailed: 'Le PAT n’a pas pu être généré. Votre quota n’a pas été débité.',
    bulletinFailed: 'Le commentaire de bulletin n’a pas pu être généré. Votre quota n’a pas été débité.',
    modificationFailed: 'Le document n’a pas pu être modifié. Votre quota n’a pas été débité.',
    contextFailed: 'Impossible de charger les données de vos classes. Votre quota n’a pas été débité.',
    quotaFailed: 'Impossible de vérifier votre quota pour le moment.',
  },
  en: {
    limit: AGENT_LIMIT_REACHED_MESSAGES.en,
    patFailed: 'The support plan could not be generated. Your quota was not charged.',
    bulletinFailed: 'The report card comment could not be generated. Your quota was not charged.',
    modificationFailed: 'The document could not be modified. Your quota was not charged.',
    contextFailed: 'Your class data could not be loaded. Your quota was not charged.',
    quotaFailed: 'Your quota could not be checked right now.',
  },
  es: {
    limit: AGENT_LIMIT_REACHED_MESSAGES.es,
    patFailed: 'No se ha podido generar el PAT. No se ha descontado de tu cuota.',
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
  const modificationIntent = latestUserMessage
    ? looksLikeDocumentModificationRequest(latestUserMessage.content)
    : false

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

  if (!modificationIntent && !patIntent && latestUserMessage && looksLikeBulletinRequest(latestUserMessage.content)) {
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
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new Error('MISSING_ANTHROPIC_API_KEY')
        }

        const result = streamText({
          model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
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
