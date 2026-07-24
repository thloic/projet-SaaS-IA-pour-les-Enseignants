'use server'

import { createHash, randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import {
  shareAdaptationSchema,
  updateVariantSchema,
  variantTypeSchema,
  type VariantType,
} from '@/features/adaptation/schemas/adaptationSchema'
import { generateAdaptationVariant } from '@/features/adaptation/server/variantGeneration.service'
import { summarizeAnonymousNeeds } from '@/features/adaptation/utils/resolveStudentNeeds'
import { checkAndIncrementUsage, decrementUsage } from '@/features/billing/server/usage'
import { getCurrentTeacherProfile, getCurrentUser } from '@/features/profile/server/profile'
import { variantToMarkdown } from '@/lib/prompts/variant'
import { createClient } from '@/lib/supabase/server'

export interface AdaptationActionState {
  error: string | null
  success: boolean
}

export interface ShareAdaptationResult extends AdaptationActionState {
  sharePath: string | null
}

const LIMIT_ERROR = 'Vous avez atteint votre limite de 3 générations gratuites ce mois-ci.'

async function refundUsage(userId: string) {
  try {
    await decrementUsage(userId)
  } catch (error) {
    console.error('[adaptation] remboursement du quota impossible', error)
  }
}

export async function updateVariantAction(
  variantId: string,
  contentMd: string
): Promise<AdaptationActionState> {
  const parsed = updateVariantSchema.safeParse({ variantId, contentMd })
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Le contenu est invalide.',
      success: false,
    }
  }

  const user = await getCurrentUser()
  if (!user) return { error: 'Vous devez être connecté.', success: false }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('adaptation_variants')
    .update({
      content_md: parsed.data.contentMd,
      content_json: null,
      status: 'complete',
      error_message: null,
    })
    .eq('id', parsed.data.variantId)
    .eq('user_id', user.id)
    .select('adaptation_set_id')
    .maybeSingle()

  if (error || !data) {
    console.error('[adaptation] modification de variante refusée', error)
    return { error: 'Les modifications n’ont pas pu être enregistrées.', success: false }
  }

  revalidatePath(`/adaptations/${data.adaptation_set_id}`)
  revalidatePath('/adaptations')
  return { error: null, success: true }
}

export async function regenerateVariantAction(
  adaptationSetId: string,
  rawVariantType: string
): Promise<AdaptationActionState> {
  const parsedType = variantTypeSchema.safeParse(rawVariantType)
  if (!parsedType.success) return { error: 'Cette variante est invalide.', success: false }

  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentTeacherProfile()])
  if (!user) return { error: 'Vous devez être connecté.', success: false }
  if (!profile) {
    return { error: 'Terminez votre profil enseignant avant de continuer.', success: false }
  }

  let shouldRefund = false
  const supabase = await createClient()
  try {
    const usage = await checkAndIncrementUsage(user.id)
    if (!usage.allowed) return { error: LIMIT_ERROR, success: false }
    shouldRefund = true

    const { data: adaptation, error: adaptationError } = await supabase
      .from('adaptation_sets')
      .select(`
        id, title, source_snapshot, subject, level,
        adaptation_students(
          student_profiles(needs, intervention_plan)
        )
      `)
      .eq('id', adaptationSetId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (adaptationError || !adaptation) throw adaptationError ?? new Error('ADAPTATION_NOT_FOUND')

    const linkedStudents = (Array.isArray(adaptation.adaptation_students)
      ? adaptation.adaptation_students
      : []
    ).flatMap((link) => {
      const rawProfile = link.student_profiles
      const profileValue = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile
      if (!profileValue) return []
      return [{
        needs: Array.isArray(profileValue.needs)
          ? profileValue.needs.filter((value): value is string => typeof value === 'string')
          : [],
        interventionPlan: Boolean(profileValue.intervention_plan),
      }]
    })

    await supabase
      .from('adaptation_variants')
      .update({ status: 'generating', error_message: null })
      .eq('adaptation_set_id', adaptationSetId)
      .eq('variant_type', parsedType.data)
      .eq('user_id', user.id)

    const generated = await generateAdaptationVariant({
      sourceContent: adaptation.source_snapshot,
      sourceTitle: adaptation.title,
      subject: adaptation.subject,
      level: adaptation.level,
      language: profile.language === 'en' ? 'en' : 'fr',
      variantType: parsedType.data,
      anonymousNeeds: summarizeAnonymousNeeds(linkedStudents),
    })

    const { error: updateError } = await supabase
      .from('adaptation_variants')
      .update({
        content_json: generated,
        content_md: variantToMarkdown(generated),
        status: 'complete',
        error_message: null,
      })
      .eq('adaptation_set_id', adaptationSetId)
      .eq('variant_type', parsedType.data)
      .eq('user_id', user.id)

    if (updateError) throw updateError

    const { data: variants } = await supabase
      .from('adaptation_variants')
      .select('status')
      .eq('adaptation_set_id', adaptationSetId)
      .eq('user_id', user.id)
    const completed = (variants ?? []).filter((variant) => variant.status === 'complete').length
    await supabase
      .from('adaptation_sets')
      .update({ status: completed === 5 ? 'complete' : 'partial' })
      .eq('id', adaptationSetId)
      .eq('user_id', user.id)

    shouldRefund = false
    revalidatePath(`/adaptations/${adaptationSetId}`)
    revalidatePath('/adaptations')
    return { error: null, success: true }
  } catch (error) {
    console.error('[adaptation] régénération de variante échouée', error)
    await supabase
      .from('adaptation_variants')
      .update({
        status: 'failed',
        error_message: 'La génération de cette variante a échoué.',
      })
      .eq('adaptation_set_id', adaptationSetId)
      .eq('variant_type', parsedType.data)
      .eq('user_id', user.id)
    if (shouldRefund) await refundUsage(user.id)
    return {
      error: 'La génération de cette variante a échoué. Votre quota n’a pas été débité.',
      success: false,
    }
  }
}

export async function deleteAdaptationAction(
  adaptationSetId: string
): Promise<AdaptationActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Vous devez être connecté.', success: false }

  const supabase = await createClient()
  const { error } = await supabase
    .from('adaptation_sets')
    .delete()
    .eq('id', adaptationSetId)
    .eq('user_id', user.id)

  if (error) {
    console.error('[adaptation] suppression refusée', error)
    return { error: 'Cette adaptation n’a pas pu être supprimée.', success: false }
  }

  revalidatePath('/adaptations')
  return { error: null, success: true }
}

export async function createAdaptationShareAction(
  adaptationSetId: string,
  variantType: VariantType | null,
  expiresInDays = 30
): Promise<ShareAdaptationResult> {
  const parsed = shareAdaptationSchema.safeParse({
    adaptationSetId,
    variantType,
    expiresInDays,
  })
  if (!parsed.success) {
    return { error: 'Les paramètres du partage sont invalides.', success: false, sharePath: null }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Vous devez être connecté.', success: false, sharePath: null }
  }

  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresInDaysValue = parsed.data.expiresInDays ?? 30
  const expiresAt = new Date(
    Date.now() + expiresInDaysValue * 24 * 60 * 60 * 1000
  ).toISOString()

  const supabase = await createClient()
  const { error } = await supabase.from('adaptation_shares').insert({
    user_id: user.id,
    adaptation_set_id: parsed.data.adaptationSetId,
    variant_type: parsed.data.variantType,
    token_hash: tokenHash,
    expires_at: expiresAt,
  })

  if (error) {
    console.error('[adaptation:share] création du lien refusée', error)
    return {
      error: 'Le lien de partage n’a pas pu être créé.',
      success: false,
      sharePath: null,
    }
  }

  return {
    error: null,
    success: true,
    sharePath: `/share/adaptation/${token}`,
  }
}

export async function revokeAdaptationSharesAction(
  adaptationSetId: string
): Promise<AdaptationActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Vous devez être connecté.', success: false }

  const supabase = await createClient()
  const { error } = await supabase
    .from('adaptation_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('adaptation_set_id', adaptationSetId)
    .eq('user_id', user.id)
    .is('revoked_at', null)

  if (error) {
    console.error('[adaptation:share] révocation refusée', error)
    return { error: 'Les liens actifs n’ont pas pu être désactivés.', success: false }
  }

  return { error: null, success: true }
}
