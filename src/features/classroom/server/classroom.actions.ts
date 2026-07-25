'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import { classSchema, observationSchema } from '@/features/classroom/schemas/classroomSchema'
import type {
  AttendanceRecord,
  AttendanceStatus,
  ClassRoom,
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

export async function createClassAction(input: {
  name: string
  level: string
  subject: string
}): Promise<ClassroomMutationResult<ClassRoom>> {
  const parsed = classSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Classe invalide.' }
  }

  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Vous devez être connecté pour créer une classe.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classes')
    .insert({ user_id: user.id, ...parsed.data })
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
  input: { name: string; level: string; subject: string }
): Promise<ClassroomMutationResult<ClassRoom>> {
  const parsed = classSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Classe invalide.' }
  }

  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Vous devez être connecté.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classes')
    .update(parsed.data)
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
  classId: string
): Promise<ClassroomMutationResult> {
  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'Votre session a expiré.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('class_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('class_id', classId)
    .eq('user_id', user.id)

  if (error) {
    console.error('[classroom] clôture de séance refusée', error)
    return { data: null, error: 'Impossible de terminer cette séance.' }
  }

  revalidatePath('/classroom')
  revalidatePath(`/classroom/${classId}`)
  return { data: null, error: null }
}
