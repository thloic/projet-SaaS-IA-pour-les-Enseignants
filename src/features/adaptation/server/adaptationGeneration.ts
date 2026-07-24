import 'server-only'

import { createHash } from 'node:crypto'
import { checkAndIncrementUsage, decrementUsage } from '@/features/billing/server/usage'
import {
  adaptationGenerationInputSchema,
  type AdaptationGenerationInput,
  type VariantType,
} from '@/features/adaptation/schemas/adaptationSchema'
import { generateAdaptationVariant } from '@/features/adaptation/server/variantGeneration.service'
import { summarizeAnonymousNeeds, resolveStudentVariant } from '@/features/adaptation/utils/resolveStudentNeeds'
import { variantToMarkdown } from '@/lib/prompts/variant'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTeacherProfile, getCurrentUser } from '@/features/profile/server/profile'

const VARIANT_TYPES: VariantType[] = ['standard', 'support', 'dys', 'adhd', 'enrichment']
const LIMIT_ERROR = 'Vous avez atteint votre limite de 3 générations gratuites ce mois-ci.'

interface OwnedStudent {
  id: string
  needs: string[]
  interventionPlan: boolean
}

export class AdaptationRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
  }
}

async function refundUsage(userId: string) {
  try {
    await decrementUsage(userId)
  } catch (error) {
    console.error('[adaptation] remboursement du quota impossible', error)
  }
}

async function resolveSource(
  userId: string,
  input: AdaptationGenerationInput
): Promise<{
  content: string
  title: string
  courseId: string | null
  documentId: string | null
}> {
  if (input.sourceType === 'paste' || input.sourceType === 'upload') {
    return {
      content: input.pastedText?.trim() ?? '',
      title: input.title,
      courseId: null,
      documentId: null,
    }
  }

  const supabase = await createClient()
  if (input.sourceType === 'course') {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, content_md, status')
      .eq('id', input.sourceId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) console.error('[adaptation] lecture du cours refusée', error)
    if (error || !data || data.status !== 'complete' || !data.content_md?.trim()) {
      throw new AdaptationRequestError(404, 'Ce cours est introuvable ou incomplet.')
    }

    return {
      content: data.content_md.trim().slice(0, 30000),
      title: data.title,
      courseId: data.id,
      documentId: null,
    }
  }

  const { data, error } = await supabase
    .from('source_documents')
    .select('id, title, content_text')
    .eq('id', input.sourceId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) console.error('[adaptation] lecture du document refusée', error)
  if (error || !data || !data.content_text?.trim()) {
    throw new AdaptationRequestError(404, 'Ce document est introuvable ou vide.')
  }

  return {
    content: data.content_text.trim().slice(0, 30000),
    title: data.title,
    courseId: null,
    documentId: data.id,
  }
}

async function loadOwnedStudents(userId: string, studentIds: string[]): Promise<OwnedStudent[]> {
  if (studentIds.length === 0) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('student_profiles')
    .select('id, needs, intervention_plan')
    .eq('user_id', userId)
    .in('id', studentIds)

  if (error) {
    console.error('[adaptation] lecture des profils élèves refusée', error)
    throw new AdaptationRequestError(500, 'Impossible de vérifier les profils élèves.')
  }

  if ((data ?? []).length !== new Set(studentIds).size) {
    throw new AdaptationRequestError(403, 'Un profil élève sélectionné est inaccessible.')
  }

  return (data ?? []).map((student) => ({
    id: student.id as string,
    needs: Array.isArray(student.needs)
      ? student.needs.filter((value): value is string => typeof value === 'string')
      : [],
    interventionPlan: Boolean(student.intervention_plan),
  }))
}

export type AdaptationGenerationResult =
  | { kind: 'reused'; adaptationId: string }
  | { kind: 'stream'; adaptationId: string; stream: ReadableStream<Uint8Array> }

export async function createAdaptationGeneration(
  rawInput: unknown,
  signal: AbortSignal
): Promise<AdaptationGenerationResult> {
  const parsed = adaptationGenerationInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    throw new AdaptationRequestError(
      400,
      parsed.error.issues[0]?.message ?? 'Les informations de la leçon sont invalides.'
    )
  }

  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentTeacherProfile()])
  if (!user) throw new AdaptationRequestError(401, 'Vous devez être connecté pour adapter une leçon.')
  if (!profile) {
    throw new AdaptationRequestError(
      400,
      'Terminez votre profil enseignant avant d’adapter une leçon.'
    )
  }
  const userId = user.id
  const generationSubject = parsed.data.subject
  const generationLevel = parsed.data.level
  const generationLanguage = profile.language === 'en' ? 'en' : 'fr'

  const source = await resolveSource(userId, parsed.data)
  const students = await loadOwnedStudents(userId, parsed.data.studentIds)
  const anonymousNeeds = summarizeAnonymousNeeds(students)
  const sourceHash = createHash('sha256')
    .update(
      JSON.stringify({
        content: source.content,
        subject: parsed.data.subject,
        level: parsed.data.level,
        language: generationLanguage,
        needs: anonymousNeeds.sort(),
      })
    )
    .digest('hex')

  const supabase = await createClient()
  if (!parsed.data.forceNew) {
    const { data: existing, error } = await supabase
      .from('adaptation_sets')
      .select('id')
      .eq('user_id', userId)
      .eq('source_hash', sourceHash)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) console.error('[adaptation] recherche de réutilisation refusée', error)
    if (existing?.id) {
      return { kind: 'reused', adaptationId: existing.id as string }
    }
  }

  const usage = await checkAndIncrementUsage(userId)
  if (!usage.allowed) throw new AdaptationRequestError(403, LIMIT_ERROR)

  let adaptationId: string | null = null
  try {
    const { data: adaptation, error: insertError } = await supabase
      .from('adaptation_sets')
      .insert({
        user_id: userId,
        title: parsed.data.title || source.title,
        source_type: parsed.data.sourceType,
        course_id: source.courseId,
        source_document_id: source.documentId,
        source_snapshot: source.content,
        source_hash: sourceHash,
        subject: parsed.data.subject,
        level: parsed.data.level,
        language: profile.language === 'en' ? 'en' : 'fr',
        status: 'generating',
      })
      .select('id')
      .single()

    if (insertError || !adaptation) throw insertError ?? new Error('ADAPTATION_INSERT_FAILED')
    adaptationId = adaptation.id as string

    const { error: variantsError } = await supabase.from('adaptation_variants').insert(
      VARIANT_TYPES.map((variantType) => ({
        user_id: userId,
        adaptation_set_id: adaptationId,
        variant_type: variantType,
        status: 'pending',
      }))
    )
    if (variantsError) throw variantsError

    if (students.length > 0) {
      const { error: studentsError } = await supabase.from('adaptation_students').insert(
        students.map((student) => ({
          user_id: userId,
          adaptation_set_id: adaptationId,
          student_id: student.id,
          suggested_variant: resolveStudentVariant(student.needs, student.interventionPlan),
        }))
      )
      if (studentsError) throw studentsError
    }
  } catch (error) {
    console.error('[adaptation] préparation de la génération échouée', error)
    if (adaptationId) {
      await supabase
        .from('adaptation_sets')
        .delete()
        .eq('id', adaptationId)
        .eq('user_id', userId)
    }
    await refundUsage(userId)
    throw new AdaptationRequestError(
      500,
      'La préparation des variantes a échoué. Réessayez dans un instant.'
    )
  }

  const setId = adaptationId as string
  const encoder = new TextEncoder()
  let settled = false
  let cancelled = false
  let successfulVariants = 0
  let usageRefunded = false

  async function refundGenerationOnce() {
    if (usageRefunded) return
    usageRefunded = true
    await refundUsage(userId)
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: Record<string, unknown>) => {
        if (!cancelled) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }

      try {
        emit({ type: 'ready', adaptationId: setId })

        let nextVariantIndex = 0

        async function generateNextVariant() {
          while (!cancelled && !signal.aborted) {
            const currentIndex = nextVariantIndex
            nextVariantIndex += 1
            const variantType = VARIANT_TYPES[currentIndex]
            if (!variantType) return

            emit({ type: 'variant_started', variantType })
            await supabase
              .from('adaptation_variants')
              .update({ status: 'generating', error_message: null })
              .eq('adaptation_set_id', setId)
              .eq('variant_type', variantType)
              .eq('user_id', userId)

            try {
              const generated = await generateAdaptationVariant({
                sourceContent: source.content,
                sourceTitle: source.title,
                subject: generationSubject,
                level: generationLevel,
                language: generationLanguage,
                variantType,
                anonymousNeeds,
                signal,
              })
              const contentMd = variantToMarkdown(generated)
              const { error: updateError } = await supabase
                .from('adaptation_variants')
                .update({
                  content_json: generated,
                  content_md: contentMd,
                  status: 'complete',
                  error_message: null,
                })
                .eq('adaptation_set_id', setId)
                .eq('variant_type', variantType)
                .eq('user_id', userId)

              if (updateError) throw updateError
              successfulVariants += 1
              emit({ type: 'variant_complete', variantType })
            } catch (error) {
              console.error('[adaptation] variante échouée', { variantType, error })
              await supabase
                .from('adaptation_variants')
                .update({
                  status: 'failed',
                  error_message: 'La génération de cette variante a échoué.',
                })
                .eq('adaptation_set_id', setId)
                .eq('variant_type', variantType)
                .eq('user_id', userId)
              emit({ type: 'variant_failed', variantType })
            }
          }
        }

        await Promise.all([generateNextVariant(), generateNextVariant()])

        if (cancelled || signal.aborted) {
          await supabase
            .from('adaptation_variants')
            .update({
              status: 'failed',
              error_message: 'Génération annulée.',
            })
            .eq('adaptation_set_id', setId)
            .in('status', ['pending', 'generating'])
            .eq('user_id', userId)
        }

        const finalStatus =
          successfulVariants === 5
            ? 'complete'
            : successfulVariants > 0
              ? 'partial'
              : 'failed'
        await supabase
          .from('adaptation_sets')
          .update({ status: finalStatus })
          .eq('id', setId)
          .eq('user_id', userId)

        if (successfulVariants === 0) await refundGenerationOnce()
        settled = true
        emit({
          type: 'complete',
          adaptationId: setId,
          status: finalStatus,
          completedVariants: successfulVariants,
        })
        if (!cancelled) controller.close()
      } catch (error) {
        console.error('[adaptation] orchestration échouée', error)
        await supabase
          .from('adaptation_sets')
          .update({ status: successfulVariants > 0 ? 'partial' : 'failed' })
          .eq('id', setId)
          .eq('user_id', userId)
        if (successfulVariants === 0) await refundGenerationOnce()
        settled = true
        if (!cancelled) controller.error(error)
      }
    },
    async cancel() {
      cancelled = true
      if (!settled) {
        await supabase
          .from('adaptation_sets')
          .update({ status: successfulVariants > 0 ? 'partial' : 'failed' })
          .eq('id', setId)
          .eq('user_id', userId)
        if (successfulVariants === 0) await refundGenerationOnce()
        settled = true
      }
    },
  })

  return { kind: 'stream', adaptationId: setId, stream }
}
