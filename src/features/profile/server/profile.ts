import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import type { TeacherIdentity, TeacherProfile } from '@/features/profile/types/profile.types'

// cache() mémorise le résultat pour la durée d'une seule requête : si layout
// et page appellent toutes les deux getCurrentUser() pendant le même rendu,
// un seul aller-retour Supabase est effectué au lieu de deux.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
})

// Pour les comptes connectés via Google, Supabase remplit user_metadata avec
// les infos du profil Google — on s'en sert pour pré-remplir l'onboarding
// plutôt que de redemander un nom déjà connu.
export function deriveNameFromUser(user: User): { firstName: string; lastName: string } {
  const metadata = user.user_metadata ?? {}

  const givenName = typeof metadata.given_name === 'string' ? metadata.given_name.trim() : ''
  const familyName = typeof metadata.family_name === 'string' ? metadata.family_name.trim() : ''

  if (givenName || familyName) {
    return { firstName: givenName, lastName: familyName }
  }

  const fullName =
    typeof metadata.full_name === 'string'
      ? metadata.full_name.trim()
      : typeof metadata.name === 'string'
        ? metadata.name.trim()
        : ''

  if (!fullName) {
    return { firstName: '', lastName: '' }
  }

  const [first, ...rest] = fullName.split(/\s+/)
  return { firstName: first ?? '', lastName: rest.join(' ') }
}

export const getCurrentTeacherProfile = cache(async (): Promise<TeacherProfile | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
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
})

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
