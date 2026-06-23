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
  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Vous devez être connecté.', info: null }
  }

  const parsedProfile = settingsProfileSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    country: formData.get('country'),
    subject: formData.get('subject'),
    gradingSystem: formData.get('gradingSystem'),
    language: formData.get('language'),
  })

  if (!parsedProfile.success) {
    return { error: parsedProfile.error.issues[0]?.message ?? 'Profil invalide.', info: null }
  }

  const supabase = await createClient()

  const { error: profileError } = await supabase
    .from('teacher_profiles')
    .update({
      first_name: parsedProfile.data.firstName,
      last_name: parsedProfile.data.lastName,
      country: parsedProfile.data.country,
      subject: parsedProfile.data.subject,
      grading_system: parsedProfile.data.gradingSystem,
      language: parsedProfile.data.language,
    })
    .eq('user_id', user.id)

  if (profileError) {
    return { error: profileError.message, info: null }
  }

  let info: string | null = null
  const submittedEmail = formData.get('email')

  if (typeof submittedEmail === 'string' && submittedEmail.trim() && submittedEmail.trim() !== user.email) {
    const parsedEmail = settingsEmailSchema.safeParse({ email: submittedEmail.trim() })
    if (!parsedEmail.success) {
      return { error: parsedEmail.error.issues[0]?.message ?? 'Email invalide.', info: null }
    }

    const { error: emailError } = await supabase.auth.updateUser({ email: parsedEmail.data.email })
    if (emailError) {
      return { error: emailError.message, info: null }
    }

    info = `Un email de confirmation a été envoyé à ${parsedEmail.data.email}. Le changement prendra effet une fois confirmé.`
  }

  // Le layout (dashboard) lit le profil pour la Sidebar/Navbar — on l'invalide
  // pour que le nouveau prénom/initiales apparaissent immédiatement.
  revalidatePath('/dashboard', 'layout')

  return { error: null, info }
}
