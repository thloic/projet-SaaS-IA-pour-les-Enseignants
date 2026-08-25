'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import { normalizeTimeZone } from '@/lib/timezone'
import { buildSessionStartMetadata } from '@/features/classroom/utils/sessionLifecycle'
import { classSchema, observationSchema } from '@/features/classroom/schemas/classroomSchema'
import {
  deleteClassTemplatePdf,
  MAX_TEMPLATE_PDF_BYTES,
  uploadClassTemplatePdf,
} from '@/features/classroom/server/documentTemplateStorage'
import type {
  AttendanceRecord,
  AttendanceStatus,
  ClassRoom,
  ClassSession,
  ObservationCategory,
  ParticipationEvent,
  StudentObservation,
  StudentProfile,
} from '@/features/classroom/types/classroom.types'

export interface ClassListItem {
  id: string
  name: string
  level: string
  subject: string
}

export async function listMyClasses(): Promise<ClassListItem[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, level, subject')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) {
    console.error('[classroom] chargement des classes refuse', error)
    return []
  }

  return data ?? []
}

export interface ClassWithStudents extends ClassListItem {
  students: StudentProfile[]
}

// Precharge classes + eleves en un seul aller-retour (2 requetes en parallele,
// independantes du nombre de classes) plutot que de refaire un aller-retour
// reseau a chaque changement de classe cote client (formulaires bulletin/correction).
export async function listMyClassesWithStudents(): Promise<ClassWithStudents[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = await createClient()
  const [classesResult, linksResult] = await Promise.all([
    supabase
      .from('classes')
      .select('id, name, level, subject')
      .eq('user_id', user.id)
      .order('name', { ascending: true }),
    supabase
      .from('class_students')
      .select('class_id, student_profiles(*)')
      .eq('user_id', user.id)
      .order('last_name', { foreignTable: 'student_profiles' })
      .order('first_name', { foreignTable: 'student_profiles' }),
  ])

  if (classesResult.error) {
    console.error('[classroom] chargement des classes refuse', classesResult.error)
    return []
  }
  if (linksResult.error) {
    console.error('[classroom] chargement des eleves refuse', linksResult.error)
    return (classesResult.data ?? []).map((classroom) => ({ ...classroom, students: [] }))
  }

  const studentsByClass = new Map<string, StudentProfile[]>()
  for (const link of linksResult.data ?? []) {
    const rawStudent = link.student_profiles as StudentProfile | StudentProfile[] | null
    const student = Array.isArray(rawStudent) ? rawStudent[0] : rawStudent
    if (!student) continue
    const list = studentsByClass.get(link.class_id as string) ?? []
    list.push(student)
    studentsByClass.set(link.class_id as string, list)
  }

  return (classesResult.data ?? []).map((classroom) => ({
    ...classroom,
    students: studentsByClass.get(classroom.id) ?? [],
  }))
}

// Utilisee a la fois pour remplir le select "eleve" cote client et pour
// verifier, cote serveur, qu'un eleve appartient bien a la classe/l'utilisateur
// avant d'enregistrer un commentaire de bulletin.
export async function listClassStudents(classId: string): Promise<StudentProfile[]> {
  if (!classId) return []

  const user = await getCurrentUser()
  if (!user) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('class_students')
    .select('student_profiles(*)')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .order('last_name', { foreignTable: 'student_profiles' })
    .order('first_name', { foreignTable: 'student_profiles' })

  if (error) {
    console.error('[classroom] chargement des eleves refuse', error)
    return []
  }

  return (data ?? [])
    .map((item) => item.student_profiles as unknown as StudentProfile | null)
    .filter((student): student is StudentProfile => Boolean(student))
}

export interface ClassroomMutationResult<T = null> {
  data: T | null
  error: string | null
}

export interface CloseClassSessionResult extends ClassroomMutationResult {
  incompleteCount: number
}

export async function startClassSessionAction(
  classId: string,
  title?: string
): Promise<ClassroomMutationResult<ClassSession>> {
  const normalizedTitle = title?.trim() ?? ''
  if (normalizedTitle.length > 120) {
    return { data: null, error: 'Le titre de la séance est trop long.' }
  }

  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Votre session a expiré.' }

  const supabase = await createClient()
  const [classResult, profileResult, activeResult] = await Promise.all([
    supabase.from('classes').select('id').eq('id', classId).eq('user_id', user.id).maybeSingle(),
    supabase.from('teacher_profiles').select('timezone').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('class_sessions')
      .select('*')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .is('ended_at', null)
      .limit(1)
      .maybeSingle(),
  ])

  if (classResult.error || !classResult.data) {
    return { data: null, error: 'Cette classe est introuvable.' }
  }
  if (profileResult.error || activeResult.error) {
    console.error('[classroom] préparation de séance refusée', profileResult.error ?? activeResult.error)
    return { data: null, error: 'Impossible de préparer cette séance.' }
  }
  if (activeResult.data) {
    return {
      data: activeResult.data as ClassSession,
      error: null,
    }
  }

  const now = new Date()
  const timezone = normalizeTimeZone(profileResult.data?.timezone)
  const metadata = buildSessionStartMetadata({ now, timeZone: timezone, title: normalizedTitle })
  const { data, error } = await supabase
    .from('class_sessions')
    .insert({
      user_id: user.id,
      class_id: classId,
      title: metadata.title,
      session_date: metadata.sessionDate,
    })
    .select('*')
    .single()

  if (error || !data) {
    if ((error as { code?: string } | null)?.code === '23505') {
      const { data: concurrentSession } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .is('ended_at', null)
        .maybeSingle()
      if (concurrentSession) return { data: concurrentSession as ClassSession, error: null }
    }
    console.error('[classroom] création de séance refusée', error)
    return { data: null, error: 'Impossible de démarrer cette séance.' }
  }

  revalidatePath('/classroom')
  revalidatePath(`/classroom/${classId}`)
  return {
    data: data as ClassSession,
    error: null,
  }
}

export async function createClassAction(input: {
  name: string
  level: string
  subject: string
  documentTemplate?: string
}): Promise<ClassroomMutationResult<ClassRoom>> {
  const parsed = classSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Classe invalide.' }
  }

  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Vous devez être connecté pour créer une classe.' }

  const { documentTemplate, ...classFields } = parsed.data
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classes')
    .insert({
      user_id: user.id,
      ...classFields,
      document_template: documentTemplate || null,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[classroom] création de classe refusée', error)
    return { data: null, error: 'Impossible de créer cette classe pour le moment.' }
  }

  revalidatePath('/classroom')
  return { data: data as ClassRoom, error: null }
}

export async function updateClassAction(
  classId: string,
  input: { name: string; level: string; subject: string; documentTemplate?: string }
): Promise<ClassroomMutationResult<ClassRoom>> {
  const parsed = classSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Classe invalide.' }
  }

  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Vous devez être connecté.' }

  const { documentTemplate, ...classFields } = parsed.data
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classes')
    .update({ ...classFields, document_template: documentTemplate || null })
    .eq('id', classId)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle()

  if (error || !data) {
    console.error('[classroom] modification de classe refusée', error)
    return { data: null, error: 'Impossible de modifier cette classe.' }
  }

  revalidatePath('/classroom')
  revalidatePath(`/classroom/${classId}`)
  return { data: data as ClassRoom, error: null }
}

export async function deleteClassAction(
  classId: string
): Promise<ClassroomMutationResult> {
  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Vous devez être connecté.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', classId)
    .eq('user_id', user.id)

  if (error) {
    console.error('[classroom] suppression de classe refusée', error)
    return { data: null, error: 'Impossible de supprimer cette classe.' }
  }

  revalidatePath('/classroom')
  return { data: null, error: null }
}

async function verifySessionStudent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sessionId: string,
  studentId: string
) {
  const { data: session, error: sessionError } = await supabase
    .from('class_sessions')
    .select('class_id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle()

  if (sessionError || !session) return false

  const { data: link, error: linkError } = await supabase
    .from('class_students')
    .select('id')
    .eq('class_id', session.class_id)
    .eq('student_id', studentId)
    .eq('user_id', userId)
    .maybeSingle()

  return !linkError && Boolean(link)
}

export async function markAttendanceAction(
  sessionId: string,
  studentId: string,
  status: AttendanceStatus
): Promise<ClassroomMutationResult<AttendanceRecord>> {
  if (!['present', 'absent', 'late', 'excused'].includes(status)) {
    return { data: null, error: 'Ce statut de présence est invalide.' }
  }

  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Votre session a expiré.' }

  const supabase = await createClient()
  if (!(await verifySessionStudent(supabase, user.id, sessionId, studentId))) {
    return { data: null, error: 'Cet élève ne fait pas partie de cette séance.' }
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(
      {
        user_id: user.id,
        session_id: sessionId,
        student_id: studentId,
        status,
      },
      { onConflict: 'session_id,student_id' }
    )
    .select('*')
    .single()

  if (error || !data) {
    console.error('[classroom] présence refusée', error)
    return { data: null, error: 'Impossible d’enregistrer cette présence.' }
  }

  return { data: data as AttendanceRecord, error: null }
}

export async function markAllStudentsPresentAction(
  sessionId: string
): Promise<ClassroomMutationResult<AttendanceRecord[]>> {
  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Votre session a expiré.' }

  const supabase = await createClient()
  const { data: session, error: sessionError } = await supabase
    .from('class_sessions')
    .select('class_id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .maybeSingle()
  if (sessionError || !session) {
    return { data: null, error: 'Cette séance est introuvable ou déjà terminée.' }
  }

  const { data: links, error: linksError } = await supabase
    .from('class_students')
    .select('student_id')
    .eq('class_id', session.class_id)
    .eq('user_id', user.id)
  if (linksError) {
    return { data: null, error: 'Impossible de charger les élèves de cette classe.' }
  }

  const { data: existing, error: existingError } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
  if (existingError) {
    return { data: null, error: 'Impossible de charger l’appel existant.' }
  }

  const existingStudentIds = new Set((existing ?? []).map((record) => record.student_id))
  const missingLinks = (links ?? []).filter((link) => !existingStudentIds.has(link.student_id))
  if (missingLinks.length === 0) return { data: (existing ?? []) as AttendanceRecord[], error: null }
  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(
      missingLinks.map((link) => ({
        user_id: user.id,
        session_id: sessionId,
        student_id: link.student_id,
        status: 'present' as const,
      })),
      { onConflict: 'session_id,student_id' }
    )
    .select('*')

  if (error || !data) {
    console.error('[classroom] appel groupé refusé', error)
    return { data: null, error: 'Impossible d’enregistrer l’appel groupé.' }
  }
  return { data: [...((existing ?? []) as AttendanceRecord[]), ...(data as AttendanceRecord[])], error: null }
}

export async function addParticipationAction(
  sessionId: string,
  studentId: string,
  value: -1 | 1 | 2,
  label: string
): Promise<ClassroomMutationResult<ParticipationEvent>> {
  if (![-1, 1, 2].includes(value) || !label.trim()) {
    return { data: null, error: 'Cette participation est invalide.' }
  }

  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Votre session a expiré.' }

  const supabase = await createClient()
  if (!(await verifySessionStudent(supabase, user.id, sessionId, studentId))) {
    return { data: null, error: 'Cet élève ne fait pas partie de cette séance.' }
  }

  const { data, error } = await supabase
    .from('participation_events')
    .insert({
      user_id: user.id,
      session_id: sessionId,
      student_id: studentId,
      value,
      label: label.trim(),
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[classroom] participation refusée', error)
    return { data: null, error: 'Impossible d’enregistrer cette participation.' }
  }

  return { data: data as ParticipationEvent, error: null }
}

export async function addObservationAction(input: {
  sessionId: string
  studentId: string
  category: ObservationCategory
  tag: string
  note?: string
}): Promise<ClassroomMutationResult<StudentObservation>> {
  const parsed = observationSchema.safeParse({
    category: input.category,
    tag: input.tag,
    note: input.note,
  })
  if (!parsed.success) {
    return {
      data: null,
      error: parsed.error.issues[0]?.message ?? 'Cette observation est invalide.',
    }
  }

  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Votre session a expiré.' }

  const supabase = await createClient()
  if (!(await verifySessionStudent(supabase, user.id, input.sessionId, input.studentId))) {
    return { data: null, error: 'Cet élève ne fait pas partie de cette séance.' }
  }

  const { data, error } = await supabase
    .from('student_observations')
    .insert({
      user_id: user.id,
      session_id: input.sessionId,
      student_id: input.studentId,
      category: parsed.data.category,
      tag: parsed.data.tag,
      note: parsed.data.note || null,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[classroom] observation refusée', error)
    return { data: null, error: 'Impossible d’enregistrer cette observation.' }
  }

  return { data: data as StudentObservation, error: null }
}

export async function closeClassSessionAction(
  sessionId: string,
  classId: string,
  force = false
): Promise<CloseClassSessionResult> {
  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Votre session a expiré.', incompleteCount: 0 }

  const supabase = await createClient()
  const [studentsResult, attendanceResult] = await Promise.all([
    supabase
      .from('class_students')
      .select('student_id')
      .eq('class_id', classId)
      .eq('user_id', user.id),
    supabase
      .from('attendance_records')
      .select('student_id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id),
  ])
  if (studentsResult.error || attendanceResult.error) {
    return { data: null, error: 'Impossible de vérifier l’appel.', incompleteCount: 0 }
  }
  const marked = new Set((attendanceResult.data ?? []).map((item) => item.student_id))
  const incompleteCount = (studentsResult.data ?? []).filter(
    (item) => !marked.has(item.student_id)
  ).length
  if (!force && incompleteCount > 0) {
    return {
      data: null,
      error: `L’appel est incomplet pour ${incompleteCount} élève${incompleteCount > 1 ? 's' : ''}.`,
      incompleteCount,
    }
  }

  const { data: closedSession, error } = await supabase
    .from('class_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .select('id')
    .maybeSingle()

  if (error || !closedSession) {
    console.error('[classroom] clôture de séance refusée', error)
    return { data: null, error: 'Impossible de terminer cette séance.', incompleteCount }
  }

  revalidatePath('/classroom')
  revalidatePath(`/classroom/${classId}`)
  return { data: null, error: null, incompleteCount }
}

export async function uploadClassDocumentTemplatePdfAction(
  classId: string,
  formData: FormData
): Promise<ClassroomMutationResult<ClassRoom>> {
  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Vous devez être connecté.' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.type !== 'application/pdf') {
    return { data: null, error: 'Le fichier doit être un PDF.' }
  }
  if (file.size > MAX_TEMPLATE_PDF_BYTES) {
    return { data: null, error: 'Le PDF dépasse la taille maximale de 10 Mo.' }
  }

  const supabase = await createClient()
  const { data: owned } = await supabase
    .from('classes')
    .select('id')
    .eq('id', classId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!owned) return { data: null, error: 'Classe introuvable.' }

  let path: string
  try {
    path = await uploadClassTemplatePdf(user.id, classId, file)
  } catch {
    return { data: null, error: 'Impossible de téléverser ce PDF pour le moment.' }
  }

  const { data, error } = await supabase
    .from('classes')
    .update({ document_template_path: path })
    .eq('id', classId)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle()

  if (error || !data) {
    console.error('[classroom] enregistrement du chemin du modele refuse', error)
    return { data: null, error: 'Impossible d’enregistrer ce PDF pour le moment.' }
  }

  revalidatePath('/classroom')
  revalidatePath(`/classroom/${classId}`)
  return { data: data as ClassRoom, error: null }
}

export async function removeClassDocumentTemplatePdfAction(
  classId: string
): Promise<ClassroomMutationResult<ClassRoom>> {
  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Vous devez être connecté.' }

  try {
    await deleteClassTemplatePdf(user.id, classId)
  } catch {
    // Le fichier peut déjà être absent du stockage : on continue quand même
    // à nettoyer la référence en base plutôt que de bloquer l'enseignant.
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classes')
    .update({ document_template_path: null })
    .eq('id', classId)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle()

  if (error || !data) {
    console.error('[classroom] retrait du modele PDF refuse', error)
    return { data: null, error: 'Impossible de retirer ce PDF pour le moment.' }
  }

  revalidatePath('/classroom')
  revalidatePath(`/classroom/${classId}`)
  return { data: data as ClassRoom, error: null }
}
