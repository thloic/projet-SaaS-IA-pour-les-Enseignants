'use server'

import { revalidatePath } from 'next/cache'
import { checkAndIncrementUsage, decrementUsage } from '@/features/billing/server/usage'
import { bulletinInputSchema } from '@/features/bulletin/schemas/bulletinSchema'
import { generateBulletinComment } from '@/features/bulletin/server/bulletinGeneration.service'
import { getCurrentTeacherProfile, getCurrentUser } from '@/features/profile/server/profile'
import { createClient } from '@/lib/supabase/server'

export interface GenerateBulletinState {
  error: string | null
  comment: string | null
}

export interface DeleteBulletinState {
  error: string | null
  success: boolean
}

export interface BulletinCommentListItem {
  id: string
  student_name: string
  subject: string
  grade: string
  observations: string | null
  tone: 'bienveillant' | 'encourageant' | 'factuel'
  comment: string
  created_at: string
}

const GENERIC_GENERATION_ERROR = 'La génération du commentaire a échoué, réessayez dans un instant.'
const GENERIC_SAVE_ERROR = 'Le commentaire n’a pas pu être enregistré, réessayez dans un instant.'
const BULLETIN_LIMIT_ERROR = 'Vous avez atteint votre limite de 3 générations gratuites ce mois-ci.'

async function refundBulletinGeneration(userId: string) {
  try {
    await decrementUsage(userId)
  } catch (error) {
    console.error('[bulletin] remboursement du quota impossible', error)
  }
}

export async function generateBulletinAction(
  _prevState: GenerateBulletinState,
  formData: FormData
): Promise<GenerateBulletinState> {
  const parsed = bulletinInputSchema.safeParse({
    student_name: formData.get('student_name'),
    subject: formData.get('subject'),
    grade: formData.get('grade'),
    observations: formData.get('observations') || undefined,
    tone: formData.get('tone'),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Complétez le formulaire avant de générer le commentaire.',
      comment: null,
    }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Vous devez être connecté pour générer un commentaire.', comment: null }
  }

  const profile = await getCurrentTeacherProfile()
  if (!profile) {
    return { error: 'Terminez votre profil enseignant avant de générer un commentaire.', comment: null }
  }

  let usage
  try {
    usage = await checkAndIncrementUsage(user.id)
  } catch (error) {
    console.error('[bulletin] vérification du quota impossible', error)
    return { error: 'Impossible de vérifier votre quota pour le moment.', comment: null }
  }

  if (!usage.allowed) {
    return { error: BULLETIN_LIMIT_ERROR, comment: null }
  }

  try {
    const generated = await generateBulletinComment({
      input: parsed.data,
      teacherProfile: {
        subject: profile.subject,
        subjects: profile.subjects,
        gradingSystem: profile.grading_system,
        language: profile.language,
      },
    })

    const supabase = await createClient()
    const { error: insertError } = await supabase.from('bulletin_comments').insert({
      user_id: user.id,
      student_name: parsed.data.student_name,
      subject: parsed.data.subject,
      grade: parsed.data.grade,
      observations: parsed.data.observations ?? null,
      tone: parsed.data.tone,
      comment: generated.comment,
    })

    if (insertError) {
      console.error('[bulletin] insertion refusee', insertError)
      throw new Error('BULLETIN_INSERT_FAILED')
    }

    revalidatePath('/bulletin')
    revalidatePath('/dashboard', 'layout')
    return { error: null, comment: generated.comment }
  } catch (error) {
    await refundBulletinGeneration(user.id)
    console.error('[bulletin] echec generation', error)
    return {
      error: error instanceof Error && error.message === 'BULLETIN_INSERT_FAILED'
        ? GENERIC_SAVE_ERROR
        : GENERIC_GENERATION_ERROR,
      comment: null,
    }
  }
}

export async function listMyBulletins(): Promise<BulletinCommentListItem[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bulletin_comments')
    .select('id, student_name, subject, grade, observations, tone, comment, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[bulletin] chargement liste refuse', error)
    throw new Error('Impossible de charger vos commentaires pour le moment.')
  }

  return (data ?? []) as BulletinCommentListItem[]
}

export async function deleteBulletinAction(id: string): Promise<DeleteBulletinState> {
  if (!id) {
    return { error: 'Commentaire introuvable.', success: false }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Vous devez être connecté pour supprimer ce commentaire.', success: false }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('bulletin_comments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[bulletin] suppression refusee', error)
      return { error: 'Le commentaire n’a pas pu être supprimé.', success: false }
    }

    revalidatePath('/bulletin')
    return { error: null, success: true }
  } catch (error) {
    console.error('[bulletin] echec suppression', error)
    return { error: 'Le commentaire n’a pas pu être supprimé.', success: false }
  }
}
