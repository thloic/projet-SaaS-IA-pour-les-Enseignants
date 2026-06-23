import { createClient } from '@/lib/supabase/server'
import type { TeacherIdentity, TeacherProfile } from '@/features/profile/types/profile.types'

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function getCurrentTeacherProfile(): Promise<TeacherProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('teacher_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Unable to load teacher profile', error)
    return null
  }

  return data
}

export function profileToTeacherIdentity(
  profile: TeacherProfile,
  options?: { generationsUsed?: number; generationsLimit?: number; plan?: 'free' | 'pro' }
): TeacherIdentity {
  const firstName = profile.first_name ?? ''
  const lastName = profile.last_name ?? ''
  const name = `${firstName} ${lastName}`.trim() || 'Enseignant'
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()

  return {
    name,
    initials: initials || 'EA',
    subject: profile.subject ?? 'Matiere non precisee',
    level: profile.levels?.[0] ?? 'Niveau non precise',
    country: profile.country ?? 'Pays non precise',
    plan: options?.plan ?? 'free',
    generationsUsed: options?.generationsUsed ?? 0,
    generationsLimit: options?.generationsLimit ?? 3,
  }
}
