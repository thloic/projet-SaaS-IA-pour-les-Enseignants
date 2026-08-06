import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { NextResponse } from 'next/server'
import { checkAndIncrementUsage, decrementUsage } from '@/features/billing/server/usage'
import {
  agentChatRequestSchema,
  agentStructuredResponseSchema,
} from '@/features/agent/schemas/agentSchema'
import { generatePAT } from '@/features/agent/server/generatePAT'
import { getStudentContext } from '@/features/agent/server/memory'
import {
  orchestratePATRequest,
  PATOrchestrationError,
} from '@/features/agent/server/patOrchestration'
import { detectPATIntent } from '@/features/agent/server/patIntent'
import { buildAgentSystemPrompt } from '@/lib/prompts/agent'
import { getCurrentTeacherProfile, getCurrentUser } from '@/features/profile/server/profile'

const LIMIT_ERROR = 'Vous avez atteint votre limite de générations gratuites pour l’agent ce mois-ci.'
const USAGE_FEATURE = 'agent'

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

  const latestUserMessage = [...parsed.data.messages]
    .reverse()
    .find((message) => message.role === 'user')
  const patIntent = latestUserMessage ? detectPATIntent(latestUserMessage.content) : null

  if (patIntent) {
    try {
      const result = await orchestratePATRequest(
        { studentQuery: patIntent.studentQuery, trustedUserId: user.id },
        {
          getStudentContext,
          generatePAT,
          checkUsage: async (userId) => checkAndIncrementUsage(userId, USAGE_FEATURE),
          refundUsage: async (userId) => decrementUsage(userId, USAGE_FEATURE),
        }
      )
      return NextResponse.json(agentStructuredResponseSchema.parse(result))
    } catch (error) {
      if (error instanceof PATOrchestrationError && error.code === 'PAT_QUOTA_EXCEEDED') {
        return jsonError(LIMIT_ERROR, 403)
      }
      console.error('[agent:pat] echec de la demande structuree')
      return jsonError('Le PAT n’a pas pu être généré. Votre quota n’a pas été débité.', 500)
    }
  }

  let usage
  try {
    usage = await checkAndIncrementUsage(user.id, USAGE_FEATURE)
  } catch (error) {
    console.error('[agent] verification du quota impossible', error)
    return jsonError('Impossible de vérifier votre quota pour le moment.', 500)
  }

  if (!usage.allowed) {
    return jsonError(LIMIT_ERROR, 403)
  }

  const systemPrompt = buildAgentSystemPrompt({
    subjects: profile.subjects,
    levels: profile.levels,
    country: profile.country,
    language: profile.language,
  })

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
