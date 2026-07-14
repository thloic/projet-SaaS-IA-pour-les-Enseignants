import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { NextResponse } from 'next/server'
import { checkAndIncrementUsage, decrementUsage } from '@/features/billing/server/usage'
import { courseInputSchema } from '@/features/generation/schemas/generationSchema'
import { buildCoursePrompt } from '@/lib/prompts/course'
import { getCurrentTeacherProfile, getCurrentUser } from '@/features/profile/server/profile'
import { createClient } from '@/lib/supabase/server'

const LIMIT_ERROR = 'Vous avez atteint votre limite de 3 générations gratuites ce mois-ci.'

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function splitText(value: string, size = 80) {
  const chunks: string[] = []
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size))
  }
  return chunks
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function extractTitle(markdown: string, fallback: string) {
  const firstTitle = markdown
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('# '))

  return firstTitle?.replace(/^#\s+/, '').trim() || fallback
}

function buildMockCourseMarkdown(input: {
  subject: string
  level: string
  topic: string
  duration_minutes: number
  objectives?: string
  activities?: string[]
}) {
  return `# ${input.topic}

## Objectifs pédagogiques
- Comprendre les notions essentielles liées à ${input.topic}.
- Mobiliser le vocabulaire adapté en ${input.subject}.
- Réaliser des exercices progressifs en autonomie.

## Prérequis
- Avoir les repères de base du niveau ${input.level}.
- Savoir lire une consigne simple et justifier une réponse.

## Déroulement
- 0 à 5 min : accueil, rappel du thème et annonce des objectifs.
- 5 à 15 min : découverte guidée avec exemples au tableau.
- 15 à ${Math.max(25, input.duration_minutes - 25)} min : activité principale ${input.activities?.length ? `(${input.activities.join(', ')})` : 'en binômes ou individuellement'}.
- ${Math.max(25, input.duration_minutes - 25)} à ${Math.max(30, input.duration_minutes - 10)} min : correction collective et institutionnalisation.
- ${Math.max(30, input.duration_minutes - 10)} à ${input.duration_minutes} min : synthèse et vérification rapide des acquis.

## Exercices d'application
1. Identifier les informations importantes dans une situation simple liée à ${input.topic}.
2. Résoudre un exercice guidé en explicitant les étapes.
3. Produire une réponse courte qui justifie le raisonnement utilisé.

## Évaluation
- Compréhension de la notion : 8 points.
- Méthode et justification : 8 points.
- Présentation et précision du vocabulaire : 4 points.

## Matériel nécessaire
- Tableau ou support de projection.
- Cahier de cours.
- Fiche d’exercices préparée par l’enseignant.`
}

async function updateCourseStatus(
  courseId: string,
  values: { status: 'complete' | 'failed'; content_md?: string; title?: string }
) {
  const supabase = await createClient()
  const { error } = await supabase.from('courses').update(values).eq('id', courseId)
  if (error) {
    console.error('[course] mise a jour du statut refusee', error)
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return jsonError('Vous devez être connecté pour générer un cours.', 401)
  }
  const userId = user.id

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('La demande est invalide.', 400)
  }

  const parsed = courseInputSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Complétez le formulaire avant de générer le cours.', 400)
  }

  const profile = await getCurrentTeacherProfile()
  if (!profile) {
    return jsonError('Terminez votre profil enseignant avant de générer un cours.', 400)
  }

  let usage
  try {
    usage = await checkAndIncrementUsage(userId)
  } catch (error) {
    console.error('[course] verification du quota impossible', error)
    return jsonError('Impossible de vérifier votre quota pour le moment.', 500)
  }

  if (!usage.allowed) {
    return jsonError(LIMIT_ERROR, 403)
  }

  const supabase = await createClient()
  const { data: course, error: insertError } = await supabase
    .from('courses')
    .insert({
      user_id: userId,
      title: parsed.data.topic,
      subject: parsed.data.subject,
      level: parsed.data.level,
      duration_minutes: parsed.data.duration_minutes,
      objectives: parsed.data.objectives ?? null,
      content_md: '',
      status: 'generating',
    })
    .select('id')
    .single()

  if (insertError || !course) {
    console.error('[course] creation refusee', insertError)
    await decrementUsage(userId)
    return jsonError('Le cours n’a pas pu être préparé, réessayez dans un instant.', 500)
  }

  const courseId = course.id as string
  const encoder = new TextEncoder()
  let completed = false
  let failed = false
  let cancelled = false
  let content = ''

  async function failGeneration(error: unknown) {
    if (completed || failed) return
    failed = true
    console.error('[course] echec generation', error)
    await updateCourseStatus(courseId, { status: 'failed', content_md: content })
    await decrementUsage(userId)
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const mode = process.env.COURSE_GENERATION_MODE

        if (mode === 'mock' || mode === 'fail') {
          const mock = buildMockCourseMarkdown(parsed.data)
          const chunks = splitText(mock)

          for (const [index, chunk] of chunks.entries()) {
            if (cancelled || request.signal.aborted) {
              throw new Error('COURSE_GENERATION_ABORTED')
            }
            content += chunk
            controller.enqueue(encoder.encode(chunk))
            await delay(30)
            if (mode === 'fail' && index >= 2) {
              throw new Error('COURSE_GENERATION_FAILED_FOR_TEST')
            }
          }
        } else {
          if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('MISSING_ANTHROPIC_API_KEY')
          }

          const { systemPrompt, userPrompt } = buildCoursePrompt(parsed.data, {
            country: profile.country,
            gradingSystem: profile.grading_system,
            language: profile.language,
          })

          const result = streamText({
            model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.25,
            maxOutputTokens: 5000,
            maxRetries: 1,
            timeout: 60000,
            abortSignal: request.signal,
          })

          for await (const chunk of result.textStream) {
            if (cancelled || request.signal.aborted) {
              throw new Error('COURSE_GENERATION_ABORTED')
            }
            content += chunk
            controller.enqueue(encoder.encode(chunk))
          }
        }

        if (cancelled || request.signal.aborted) {
          throw new Error('COURSE_GENERATION_ABORTED')
        }

        const title = extractTitle(content, parsed.data.topic)
        await updateCourseStatus(courseId, {
          status: 'complete',
          content_md: content,
          title,
        })
        completed = true
        controller.close()
      } catch (error) {
        await failGeneration(error)
        controller.error(error)
      }
    },
    async cancel(reason) {
      cancelled = true
      await failGeneration(reason ?? new Error('COURSE_GENERATION_ABORTED'))
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Course-Id': courseId,
    },
  })
}
