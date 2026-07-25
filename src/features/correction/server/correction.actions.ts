'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTeacherProfile, getCurrentUser } from '@/features/profile/server/profile'
import { listClassStudents } from '@/features/classroom/server/classroom.actions'
import { createCorrectionBatchSchema, type CorrectionTone } from '@/features/correction/schemas/correctionSchema'
import { filterNonEmptyCopies, type RawBatchCopyInput } from '@/features/correction/utils/prepareBatchCopies'
import { generateCorrectionForCopy } from '@/features/correction/server/correctionGeneration.service'
import type { CorrectionBatch, CorrectionCopy } from '@/features/correction/types/correction.types'

export interface CorrectionActionState {
  error: string | null
  success: boolean
}

export interface CreateCorrectionBatchState {
  error: string | null
  batchId: string | null
}

export interface CorrectionBatchListItem {
  id: string
  status: CorrectionBatch['status']
  created_at: string
  className: string
  copyCount: number
}

export interface CorrectionBatchDetail {
  batch: CorrectionBatch
  className: string
  copies: Array<CorrectionCopy & { studentName: string }>
}

export async function createCorrectionBatchAction(
  classId: string,
  rawCopies: RawBatchCopyInput[]
): Promise<CreateCorrectionBatchState> {
  const parsed = createCorrectionBatchSchema.safeParse({
    classId,
    copies: filterNonEmptyCopies(rawCopies),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Complétez au moins une copie avant de continuer.',
      batchId: null,
    }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Vous devez être connecté pour importer des copies.', batchId: null }
  }

  // listClassStudents scope deja la requete a l'utilisateur courant : si un
  // studentId fourni n'y figure pas, il n'appartient pas a cette classe/cet utilisateur.
  const classStudents = await listClassStudents(parsed.data.classId)
  const validStudentIds = new Set(classStudents.map((student) => student.id))
  const invalidCopy = parsed.data.copies.find((copy) => !validStudentIds.has(copy.studentId))
  if (invalidCopy || classStudents.length === 0) {
    return { error: 'Un élève sélectionné ne fait pas partie de cette classe.', batchId: null }
  }

  const supabase = await createClient()

  const { data: batch, error: batchError } = await supabase
    .from('correction_batches')
    .insert({ user_id: user.id, class_id: parsed.data.classId, status: 'draft' })
    .select('id')
    .single()

  if (batchError || !batch) {
    console.error('[correction] création du lot refusée', batchError)
    return { error: 'Impossible de créer ce lot de correction pour le moment.', batchId: null }
  }

  const { error: copiesError } = await supabase.from('correction_copies').insert(
    parsed.data.copies.map((copy) => ({
      user_id: user.id,
      batch_id: batch.id,
      student_id: copy.studentId,
      content_text: copy.contentText,
      status: 'pending',
    }))
  )

  if (copiesError) {
    console.error('[correction] insertion des copies refusée', copiesError)
    await supabase.from('correction_batches').delete().eq('id', batch.id).eq('user_id', user.id)
    return { error: 'Impossible d’enregistrer les copies pour le moment.', batchId: null }
  }

  revalidatePath('/correction')
  return { error: null, batchId: batch.id as string }
}

export async function listMyCorrectionBatches(): Promise<CorrectionBatchListItem[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('correction_batches')
    .select('id, status, created_at, classes(name), correction_copies(id)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[correction] chargement des lots refusé', error)
    return []
  }

  return (data ?? []).map((row) => {
    const classroom = Array.isArray(row.classes) ? row.classes[0] : row.classes
    const copies = Array.isArray(row.correction_copies) ? row.correction_copies : []
    return {
      id: row.id as string,
      status: row.status as CorrectionBatch['status'],
      created_at: row.created_at as string,
      className: (classroom?.name as string) ?? 'Classe',
      copyCount: copies.length,
    }
  })
}

export async function getCorrectionBatch(batchId: string): Promise<CorrectionBatchDetail | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: batch, error: batchError } = await supabase
    .from('correction_batches')
    .select('*, classes(name)')
    .eq('id', batchId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (batchError || !batch) {
    if (batchError) console.error('[correction] chargement du lot refusé', batchError)
    return null
  }

  const { data: copies, error: copiesError } = await supabase
    .from('correction_copies')
    .select('*, student_profiles(first_name, last_name)')
    .eq('batch_id', batchId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (copiesError) {
    console.error('[correction] chargement des copies refusé', copiesError)
    return null
  }

  const classroom = Array.isArray(batch.classes) ? batch.classes[0] : batch.classes

  return {
    batch: batch as CorrectionBatch,
    className: (classroom?.name as string) ?? 'Classe',
    copies: (copies ?? []).map((row) => {
      const rawRow = row as CorrectionCopy & {
        student_profiles: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null
      }
      const rawStudent = rawRow.student_profiles
      const student = Array.isArray(rawStudent) ? rawStudent[0] : rawStudent
      const copy: CorrectionCopy = {
        id: rawRow.id,
        user_id: rawRow.user_id,
        batch_id: rawRow.batch_id,
        student_id: rawRow.student_id,
        content_text: rawRow.content_text,
        findings: rawRow.findings,
        comment: rawRow.comment,
        status: rawRow.status,
        validated_at: rawRow.validated_at,
        created_at: rawRow.created_at,
        updated_at: rawRow.updated_at,
      }
      return {
        ...copy,
        studentName: student
          ? `${student.first_name} ${student.last_name}`
          : 'Élève',
      }
    }),
  }
}

// Relance uniquement la copie en echec (US-14) : pas de nouvelle consommation
// de quota, il s'agit de terminer une generation deja payee au lancement du lot.
export async function retryCorrectionCopyAction(copyId: string): Promise<CorrectionActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Vous devez être connecté.', success: false }

  const supabase = await createClient()
  const { data: copy, error: copyError } = await supabase
    .from('correction_copies')
    .select('id, batch_id, content_text, correction_batches(tone)')
    .eq('id', copyId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (copyError || !copy) {
    return { error: 'Cette copie est introuvable.', success: false }
  }

  const batch = Array.isArray(copy.correction_batches) ? copy.correction_batches[0] : copy.correction_batches
  const tone = batch?.tone as CorrectionTone | undefined
  if (!tone) {
    return { error: 'Le ton de ce lot n’a pas encore été défini.', success: false }
  }

  const profile = await getCurrentTeacherProfile()
  if (!profile) {
    return { error: 'Terminez votre profil enseignant avant de continuer.', success: false }
  }

  await supabase
    .from('correction_copies')
    .update({ status: 'generating' })
    .eq('id', copyId)
    .eq('user_id', user.id)

  try {
    const generated = await generateCorrectionForCopy({
      contentText: copy.content_text,
      tone,
      teacherProfile: { level: profile.levels?.[0] ?? null, language: profile.language },
    })

    const { error: updateError } = await supabase
      .from('correction_copies')
      .update({ findings: generated.findings, comment: generated.comment, status: 'complete' })
      .eq('id', copyId)
      .eq('user_id', user.id)

    if (updateError) throw updateError

    revalidatePath(`/correction/${copy.batch_id}`)
    return { error: null, success: true }
  } catch (error) {
    console.error('[correction] relance de copie échouée', error)
    await supabase
      .from('correction_copies')
      .update({ status: 'failed' })
      .eq('id', copyId)
      .eq('user_id', user.id)
    return { error: 'La relance de cette copie a échoué. Réessayez dans un instant.', success: false }
  }
}
