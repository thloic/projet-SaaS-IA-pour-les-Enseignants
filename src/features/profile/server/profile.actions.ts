'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import { profileSchema } from '@/features/profile/schemas/profileSchema'
import { settingsProfileSchema, settingsEmailSchema } from '@/features/profile/schemas/settingsSchema'
import {
  getProfileSaveErrorMessage,
  isInvalidAuthUserReferenceError,
  isMissingSubjectsColumnError,
  isUnsupportedGradingSystemError,
  normalizeProfileSaveError,
  withLegacyGradingSystem,
  withLegacyProfileCompatibility,
  withoutSubjectsColumn,
} from '@/features/profile/utils/profileSaveError'

export interface UpdateProfileState {
  error: string | null
  info: string | null
}

export interface OnboardingProfileState {
  error: string | null
  /** Si présent, le client doit rediriger vers cette URL après avoir affiché l'erreur. */
  redirectTo?: string
}

export async function saveOnboardingProfileAction(data: {
  firstName: string
  lastName: string
  country: string
  subjects: string[]
  levels: string[]
  gradingSystem: string
  language: string
  styleNotes: string
}): Promise<OnboardingProfileState> {
  try {
    const user = await getCurrentUser()
    console.log('[onboarding:server] getCurrentUser result', {
      userId: user?.id ?? null,
      email: user?.email ?? null,
      aud: user?.aud ?? null,
      createdAt: user?.created_at ?? null,
    })

    if (!user) {
      return { error: 'Votre session a expiré. Reconnectez-vous avant de terminer votre profil.' }
    }

    const parsed = profileSchema.safeParse(data)
    if (!parsed.success) {
      console.log('[onboarding:server] profile validation failed', {
        issues: parsed.error.issues,
      })
      return { error: parsed.error.issues[0]?.message ?? 'Profil incomplet.' }
    }

    const supabase = await createClient()
    const profilePayload = {
      user_id: user.id,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      country: parsed.data.country,
      subject: parsed.data.subjects[0],
      subjects: parsed.data.subjects,
      levels: parsed.data.levels,
      grading_system: parsed.data.gradingSystem,
      language: parsed.data.language,
      style_notes: parsed.data.styleNotes || null,
    }
    console.log('[onboarding:server] upsert teacher profile attempt', {
      userId: profilePayload.user_id,
      country: profilePayload.country,
      subject: profilePayload.subject,
      subjects: profilePayload.subjects,
      levels: profilePayload.levels,
      gradingSystem: profilePayload.grading_system,
      language: profilePayload.language,
    })

    const { error: profileError } = await supabase
      .from('teacher_profiles')
      .upsert(profilePayload, { onConflict: 'user_id' })

    if (profileError) {
      const normalized = normalizeProfileSaveError(profileError)
      console.error('[onboarding:server] upsert teacher profile failed', normalized)

      // Le user_id du JWT n'existe pas dans auth.users : session périmée,
      // utilisateur supprimé, ou cookies issus d'un autre état Supabase.
      if (isInvalidAuthUserReferenceError(profileError)) {
        try {
          const { error: signOutError } = await supabase.auth.signOut()
          console.log('[onboarding:server] server signOut after invalid user', {
            error: signOutError ? normalizeProfileSaveError(signOutError) : null,
          })
        } catch (signOutError) {
          console.error('[onboarding] échec de la déconnexion après session invalide', normalizeProfileSaveError(signOutError))
        }

        return {
          error: 'Votre session est expirée ou invalide. Reconnectez-vous pour créer votre profil.',
          redirectTo: '/login',
        }
      }

      const missingSubjectsColumn = isMissingSubjectsColumnError(profileError)
      const unsupportedGradingSystem = isUnsupportedGradingSystemError(profileError)

      if (!missingSubjectsColumn && !unsupportedGradingSystem) {
        throw profileError
      }

      const compatiblePayload = unsupportedGradingSystem
        ? withLegacyGradingSystem(profilePayload)
        : profilePayload
      const retryPayload = missingSubjectsColumn
        ? withoutSubjectsColumn(compatiblePayload)
        : compatiblePayload

      const { error: legacyError } = await supabase
        .from('teacher_profiles')
        .upsert(retryPayload, { onConflict: 'user_id' })

      if (legacyError) {
        console.error('[onboarding:server] compatibility retry failed', normalizeProfileSaveError(legacyError))
        const canUseFullCompatibility =
          isMissingSubjectsColumnError(legacyError) ||
          isUnsupportedGradingSystemError(legacyError)

        if (!canUseFullCompatibility) {
          throw legacyError
        }

        const { error: fullCompatibilityError } = await supabase
          .from('teacher_profiles')
          .upsert(withLegacyProfileCompatibility(profilePayload), { onConflict: 'user_id' })

        if (fullCompatibilityError) {
          console.error('[onboarding:server] full compatibility retry failed', normalizeProfileSaveError(fullCompatibilityError))
          throw fullCompatibilityError
        }
      }

      console.warn('[onboarding] profil enregistré en mode compatible, migration Supabase requise', profileError)
    }

    revalidatePath('/dashboard', 'layout')
    return { error: null }
  } catch (error) {
    console.error('[onboarding] échec de la sauvegarde du profil', normalizeProfileSaveError(error))
    return { error: getProfileSaveErrorMessage(error) }
  }
}

export async function updateProfileAction(
  _prevState: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: 'Votre session a expiré. Reconnectez-vous pour enregistrer vos modifications.', info: null }
    }

    const parsedProfile = settingsProfileSchema.safeParse({
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      country: formData.get('country'),
      subjects: formData.getAll('subjects'),
      gradingSystem: formData.get('gradingSystem'),
      language: formData.get('language'),
    })

    if (!parsedProfile.success) {
      return { error: parsedProfile.error.issues[0]?.message ?? 'Vérifiez les informations de votre profil.', info: null }
    }

    const supabase = await createClient()
    const profilePayload = {
      first_name: parsedProfile.data.firstName,
      last_name: parsedProfile.data.lastName,
      country: parsedProfile.data.country,
      subject: parsedProfile.data.subjects[0],
      subjects: parsedProfile.data.subjects,
      grading_system: parsedProfile.data.gradingSystem,
      language: parsedProfile.data.language,
    }

    const { error: profileError } = await supabase
      .from('teacher_profiles')
      .update(profilePayload)
      .eq('user_id', user.id)

    if (profileError) {
      const missingSubjectsColumn = isMissingSubjectsColumnError(profileError)
      const unsupportedGradingSystem = isUnsupportedGradingSystemError(profileError)

      if (!missingSubjectsColumn && !unsupportedGradingSystem) {
        throw profileError
      }

      const compatiblePayload = unsupportedGradingSystem
        ? withLegacyGradingSystem(profilePayload)
        : profilePayload
      const retryPayload = missingSubjectsColumn
        ? withoutSubjectsColumn(compatiblePayload)
        : compatiblePayload

      const { error: legacyProfileError } = await supabase
        .from('teacher_profiles')
        .update(retryPayload)
        .eq('user_id', user.id)

      if (legacyProfileError) {
        const canUseFullCompatibility =
          isMissingSubjectsColumnError(legacyProfileError) ||
          isUnsupportedGradingSystemError(legacyProfileError)

        if (!canUseFullCompatibility) {
          throw legacyProfileError
        }

        const { error: fullCompatibilityError } = await supabase
          .from('teacher_profiles')
          .update(withLegacyProfileCompatibility(profilePayload))
          .eq('user_id', user.id)

        if (fullCompatibilityError) {
          throw fullCompatibilityError
        }
      }

      console.warn(
        '[settings] profil enregistré en mode compatible, migration Supabase requise',
        normalizeProfileSaveError(profileError)
      )
    }

    let info: string | null = null
    const submittedEmail = formData.get('email')

    if (typeof submittedEmail === 'string' && submittedEmail.trim() && submittedEmail.trim() !== user.email) {
      const parsedEmail = settingsEmailSchema.safeParse({ email: submittedEmail.trim() })
      if (!parsedEmail.success) {
        return { error: parsedEmail.error.issues[0]?.message ?? 'Saisissez une adresse email valide.', info: null }
      }

      const { error: emailError } = await supabase.auth.updateUser({ email: parsedEmail.data.email })
      if (emailError) throw emailError

      info = `Un email de confirmation a été envoyé à ${parsedEmail.data.email}. Le changement prendra effet une fois confirmé.`
    }

    revalidatePath('/dashboard', 'layout')
    return { error: null, info }
  } catch (error) {
    console.error('[settings] échec de la mise à jour du profil', normalizeProfileSaveError(error))
    return {
      error: getProfileSaveErrorMessage(error),
      info: null,
    }
  }
}
