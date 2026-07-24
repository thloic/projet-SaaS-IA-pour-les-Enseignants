'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import type { StudentProfile } from '@/features/classroom/types/classroom.types'

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
