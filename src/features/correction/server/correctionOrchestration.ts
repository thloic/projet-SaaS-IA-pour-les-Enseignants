import 'server-only'

import { checkAndIncrementUsage, decrementUsage } from '@/features/billing/server/usage'
import { launchCorrectionBatchSchema } from '@/features/correction/schemas/correctionSchema'
import { generateCorrectionForCopy } from '@/features/correction/server/correctionGeneration.service'
import { getCurrentTeacherProfile, getCurrentUser } from '@/features/profile/server/profile'
import { createClient } from '@/lib/supabase/server'

const LIMIT_ERROR = 'Vous avez atteint votre limite de générations gratuites pour la Correction IA ce mois-ci.'
const USAGE_FEATURE = 'correction'

export class CorrectionRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
  }
}

interface PendingCopy {
  id: string
  content_text: string
}

export async function createCorrectionBatchGeneration(
  rawInput: unknown,
  signal: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const parsed = launchCorrectionBatchSchema.safeParse(rawInput)
  if (!parsed.success) {
    throw new CorrectionRequestError(
      400,
      parsed.error.issues[0]?.message ?? 'Les informations de lancement sont invalides.'
    )
  }

  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentTeacherProfile()])
  if (!user) throw new CorrectionRequestError(401, 'Vous devez être connecté.')
  if (!profile) {
    throw new CorrectionRequestError(400, 'Terminez votre profil enseignant avant de continuer.')
  }
  const userId = user.id

  const supabase = await createClient()
  const { data: batch, error: batchError } = await supabase
    .from('correction_batches')
    .select('id, status')
    .eq('id', parsed.data.batchId)
    .eq('user_id', userId)
    .maybeSingle()

  if (batchError || !batch) {
    throw new CorrectionRequestError(404, 'Ce lot de correction est introuvable.')
  }
  if (batch.status === 'generating') {
    throw new CorrectionRequestError(409, 'Ce lot est déjà en cours de correction.')
  }

  const { data: pendingCopies, error: copiesError } = await supabase
    .from('correction_copies')
    .select('id, content_text')
    .eq('batch_id', parsed.data.batchId)
    .eq('user_id', userId)
    .eq('status', 'pending')

  if (copiesError) {
    console.error('[correction] lecture des copies refusée', copiesError)
    throw new CorrectionRequestError(500, 'Impossible de charger les copies de ce lot.')
  }
  if (!pendingCopies || pendingCopies.length === 0) {
    throw new CorrectionRequestError(400, 'Aucune copie en attente dans ce lot.')
  }

  // Une génération = un lancement de lot (comme pour les 5 variantes d'adaptation),
  // pas une génération par copie — sinon le compteur dédié serait aussi vite
  // épuisé que le compteur global qu'on cherche justement à éviter.
  const usage = await checkAndIncrementUsage(userId, USAGE_FEATURE)
  if (!usage.allowed) throw new CorrectionRequestError(403, LIMIT_ERROR)

  await supabase
    .from('correction_batches')
    .update({ tone: parsed.data.tone, status: 'generating' })
    .eq('id', parsed.data.batchId)
    .eq('user_id', userId)

  const copies = pendingCopies as PendingCopy[]
  const batchId = parsed.data.batchId
  const tone = parsed.data.tone
  const teacherProfile = { level: profile.levels?.[0] ?? null, language: profile.language }

  const encoder = new TextEncoder()
  let cancelled = false
  let settled = false
  let successfulCount = 0
  let usageRefunded = false

  async function refundOnce() {
    if (usageRefunded) return
    usageRefunded = true
    await decrementUsage(userId, USAGE_FEATURE)
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: Record<string, unknown>) => {
        if (!cancelled) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }

      try {
        emit({ type: 'ready', batchId, total: copies.length })

        let nextIndex = 0

        async function processNext() {
          while (!cancelled && !signal.aborted) {
            const current = copies[nextIndex]
            nextIndex += 1
            if (!current) return

            emit({ type: 'copy_started', copyId: current.id })
            await supabase
              .from('correction_copies')
              .update({ status: 'generating' })
              .eq('id', current.id)
              .eq('user_id', userId)

            try {
              const generated = await generateCorrectionForCopy({
                contentText: current.content_text,
                tone,
                teacherProfile,
              })

              const { error: updateError } = await supabase
                .from('correction_copies')
                .update({
                  findings: generated.findings,
                  comment: generated.comment,
                  status: 'complete',
                })
                .eq('id', current.id)
                .eq('user_id', userId)

              if (updateError) throw updateError
              successfulCount += 1
              emit({ type: 'copy_complete', copyId: current.id })
            } catch (error) {
              console.error('[correction] copie échouée', { copyId: current.id, error })
              await supabase
                .from('correction_copies')
                .update({ status: 'failed' })
                .eq('id', current.id)
                .eq('user_id', userId)
              emit({ type: 'copy_failed', copyId: current.id })
            }
          }
        }

        await Promise.all([processNext(), processNext()])

        const finalStatus =
          successfulCount === copies.length ? 'complete' : successfulCount > 0 ? 'partial' : 'partial'
        await supabase
          .from('correction_batches')
          .update({ status: finalStatus })
          .eq('id', batchId)
          .eq('user_id', userId)

        if (successfulCount === 0) await refundOnce()
        settled = true
        emit({ type: 'complete', batchId, successfulCount, total: copies.length })
        if (!cancelled) controller.close()
      } catch (error) {
        console.error('[correction] orchestration échouée', error)
        await supabase
          .from('correction_batches')
          .update({ status: 'partial' })
          .eq('id', batchId)
          .eq('user_id', userId)
        if (successfulCount === 0) await refundOnce()
        settled = true
        if (!cancelled) controller.error(error)
      }
    },
    async cancel() {
      cancelled = true
      if (!settled) {
        await supabase
          .from('correction_batches')
          .update({ status: 'partial' })
          .eq('id', batchId)
          .eq('user_id', userId)
        if (successfulCount === 0) await refundOnce()
        settled = true
      }
    },
  })
}
