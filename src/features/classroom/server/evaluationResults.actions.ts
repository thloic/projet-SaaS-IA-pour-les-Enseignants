'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import {
  evaluationResultBatchSchema,
  evaluationResultEntrySchema,
  evaluationResultUpdateSchema,
} from '@/features/classroom/schemas/classroomSchema'
import type { EvaluationResult } from '@/features/classroom/types/classroom.types'
import type { ClassroomMutationResult } from '@/features/classroom/server/classroom.actions'

export interface EvaluationResultWithStudent extends EvaluationResult {
  studentName: string
}

interface StudentRelation {
  first_name: string
  last_name: string
}

interface EvaluationResultRow extends EvaluationResult {
  student_profiles: StudentRelation | StudentRelation[] | null
}

function evaluationPath(classId: string) {
  return `/classroom/${classId}/evaluations`
}

function revalidateEvaluationPaths(classId: string) {
  revalidatePath(evaluationPath(classId))
  revalidatePath(`/classroom/${classId}`)
}

async function getOwnedClassStudentIds(userId: string, classId: string): Promise<Set<string> | null> {
  const supabase = await createClient()
  const [classResult, linksResult] = await Promise.all([
    supabase.from('classes').select('id').eq('id', classId).eq('user_id', userId).maybeSingle(),
    supabase
      .from('class_students')
      .select('student_id')
      .eq('class_id', classId)
      .eq('user_id', userId),
  ])

  if (classResult.error || linksResult.error) {
    console.error('[evaluations] vérification de la classe refusée', classResult.error ?? linksResult.error)
    throw new Error('EVALUATION_OWNERSHIP_LOOKUP_FAILED')
  }
  if (!classResult.data) return null
  return new Set((linksResult.data ?? []).map(({ student_id }) => student_id))
}

export async function saveEvaluationResultsBatchAction(
  input: unknown
): Promise<ClassroomMutationResult<EvaluationResult[]>> {
  const parsed = evaluationResultBatchSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: 'Les résultats saisis sont invalides.' }

  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Votre session a expiré.' }

  try {
    const allowedStudentIds = await getOwnedClassStudentIds(user.id, parsed.data.classId)
    if (!allowedStudentIds) return { data: null, error: 'Cette classe est introuvable.' }
    if (parsed.data.results.some(({ studentId }) => !allowedStudentIds.has(studentId))) {
      return { data: null, error: 'Un élève ne fait pas partie de cette classe.' }
    }

    const supabase = await createClient()
    const title = parsed.data.title || null
    const { data, error } = await supabase
      .from('evaluation_results')
      .insert(parsed.data.results.map(({ studentId, grade }) => ({
        user_id: user.id,
        class_id: parsed.data.classId,
        student_id: studentId,
        title,
        grade,
      })))
      .select('*')

    if (error) throw error
    revalidateEvaluationPaths(parsed.data.classId)
    return { data: (data ?? []) as EvaluationResult[], error: null }
  } catch (error) {
    console.error('[evaluations] enregistrement groupé refusé', error)
    return { data: null, error: 'Impossible d’enregistrer ces résultats.' }
  }
}

export async function saveEvaluationResultAction(
  classIdInput: unknown,
  studentId: unknown,
  title: unknown,
  grade: unknown
): Promise<ClassroomMutationResult<EvaluationResult>> {
  const classId = typeof classIdInput === 'string' ? classIdInput : ''
  const parsed = evaluationResultBatchSchema.safeParse({
    classId,
    title,
    results: [{ studentId, grade }],
  })
  if (!parsed.success) return { data: null, error: 'Le résultat saisi est invalide.' }

  const result = await saveEvaluationResultsBatchAction(parsed.data)
  return { data: result.data?.[0] ?? null, error: result.error }
}

export async function updateEvaluationResultAction(
  resultId: unknown,
  input: unknown
): Promise<ClassroomMutationResult<EvaluationResult>> {
  const id = evaluationResultEntrySchema.shape.studentId.safeParse(resultId)
  const parsed = evaluationResultUpdateSchema.safeParse(input)
  if (!id.success || !parsed.success) return { data: null, error: 'Le résultat saisi est invalide.' }

  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Votre session a expiré.' }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('evaluation_results')
    .update({ title: parsed.data.title || null, grade: parsed.data.grade })
    .eq('id', id.data)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('[evaluations] modification refusée', error)
    return { data: null, error: 'Impossible de modifier ce résultat.' }
  }
  if (!data) return { data: null, error: 'Ce résultat est introuvable.' }
  revalidateEvaluationPaths(data.class_id)
  return { data: data as EvaluationResult, error: null }
}

export async function deleteEvaluationResultAction(
  resultId: unknown
): Promise<ClassroomMutationResult<{ id: string }>> {
  const id = evaluationResultEntrySchema.shape.studentId.safeParse(resultId)
  if (!id.success) return { data: null, error: 'Ce résultat est invalide.' }

  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Votre session a expiré.' }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('evaluation_results')
    .delete()
    .eq('id', id.data)
    .eq('user_id', user.id)
    .select('id, class_id')
    .maybeSingle()

  if (error) {
    console.error('[evaluations] suppression refusée', error)
    return { data: null, error: 'Impossible de supprimer ce résultat.' }
  }
  if (!data) return { data: null, error: 'Ce résultat est introuvable.' }
  revalidateEvaluationPaths(data.class_id)
  return { data: { id: data.id }, error: null }
}

export async function listClassEvaluationResults(classId: string): Promise<EvaluationResultWithStudent[]> {
  const classIdResult = evaluationResultBatchSchema.shape.classId.safeParse(classId)
  if (!classIdResult.success) return []
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('evaluation_results')
    .select('*, student_profiles!inner(first_name, last_name)')
    .eq('class_id', classIdResult.data)
    .eq('user_id', user.id)
    .eq('student_profiles.user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[evaluations] chargement refusé', error)
    throw new Error('Impossible de charger les résultats de cette classe.')
  }

  return (data ?? []).flatMap((raw) => {
    const row = raw as unknown as EvaluationResultRow
    const student = Array.isArray(row.student_profiles) ? row.student_profiles[0] : row.student_profiles
    if (!student) return []
    return [{
      id: row.id,
      user_id: row.user_id,
      class_id: row.class_id,
      student_id: row.student_id,
      title: row.title,
      grade: row.grade,
      created_at: row.created_at,
      studentName: `${student.first_name} ${student.last_name}`.trim(),
    }]
  })
}
