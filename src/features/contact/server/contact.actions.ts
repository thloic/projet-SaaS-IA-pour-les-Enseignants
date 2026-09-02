'use server'

import { Resend } from 'resend'
import { contactSchema } from '@/features/contact/schemas/contactSchema'
import { buildContactEmail } from '@/features/contact/server/contactEmail'

const DEFAULT_CONTACT_EMAIL = 'dorcyb7@gmail.com'

export interface ContactActionResult {
  success: boolean
  error: string | null
}

export async function submitContactAction(formData: FormData): Promise<ContactActionResult> {
  // A filled honeypot indicates an automated submission. Return a neutral success
  // response so bots do not learn how the protection works.
  if (String(formData.get('website') ?? '').trim()) {
    return { success: true, error: null }
  }

  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone') ?? '',
    organization: formData.get('organization') ?? '',
    reason: formData.get('reason'),
    message: formData.get('message'),
    locale: formData.get('locale'),
    website: '',
  })

  if (!parsed.success) {
    return { success: false, error: 'Vérifiez les informations du formulaire avant de continuer.' }
  }

  const apiKey = process.env.RESEND_API_KEY
  const contactEmail = process.env.CONTACT_EMAIL?.trim() || DEFAULT_CONTACT_EMAIL
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'EducAssist <onboarding@resend.dev>'

  if (!apiKey) {
    console.error('[contact] RESEND_API_KEY manquant')
    return { success: false, error: 'Le formulaire de contact est momentanément indisponible.' }
  }

  try {
    const resend = new Resend(apiKey)
    const email = buildContactEmail(parsed.data)
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: contactEmail,
      ...email,
    })

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('[contact] échec de l’envoi du formulaire', error)
    return { success: false, error: 'Nous n’avons pas pu envoyer votre demande. Réessayez dans quelques instants.' }
  }
}
