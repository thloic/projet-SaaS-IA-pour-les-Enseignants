'use server'

import { Resend } from 'resend'
import { contactSchema } from '@/features/contact/schemas/contactSchema'

export interface ContactActionResult {
  success: boolean
  error: string | null
}

export async function submitContactAction(formData: FormData): Promise<ContactActionResult> {
  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    phone: formData.get('phone'),
  })

  if (!parsed.success) {
    return { success: false, error: 'Vérifiez les informations du formulaire avant de continuer.' }
  }

  const apiKey = process.env.RESEND_API_KEY
  const contactEmail = process.env.CONTACT_EMAIL
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'EducAssist <onboarding@resend.dev>'

  if (!apiKey || !contactEmail) {
    console.error('[contact] RESEND_API_KEY ou CONTACT_EMAIL manquant')
    return { success: false, error: 'Le formulaire de contact est momentanément indisponible.' }
  }

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: contactEmail,
      replyTo: parsed.data.email,
      subject: `[EducAssist] ${parsed.data.subject}`,
      text: [
        `Nom : ${parsed.data.name}`,
        `Email : ${parsed.data.email}`,
        `Téléphone : ${parsed.data.phone}`,
        `Sujet : ${parsed.data.subject}`,
      ].join('\n'),
    })

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('[contact] échec de l’envoi du formulaire', error)
    return { success: false, error: 'Nous n’avons pas pu envoyer votre demande. Réessayez dans quelques instants.' }
  }
}
