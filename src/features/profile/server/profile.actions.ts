'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import { settingsProfileSchema, settingsEmailSchema } from '@/features/profile/schemas/settingsSchema'

export interface UpdateProfileState {
  error: string | null
  info: string | null
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
    const { error: profileError } = await supabase
      .from('teacher_profiles')
      .update({
        first_name: parsedProfile.data.firstName,
        last_name: parsedProfile.data.lastName,
        country: parsedProfile.data.country,
        subject: parsedProfile.data.subjects[0],
        subjects: parsedProfile.data.subjects,
        grading_system: parsedProfile.data.gradingSystem,
        language: parsedProfile.data.language,
      })
      .eq('user_id', user.id)

    if (profileError) throw profileError

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
    console.error('[settings] échec de la mise à jour du profil', error)
    return {
      error: "Nous n’avons pas pu enregistrer vos modifications. Réessayez dans quelques instants.",
      info: null,
    }
  }
}
