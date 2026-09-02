import type { ContactInput, ContactReason } from '../schemas/contactSchema'

const REASON_LABELS: Record<ContactReason, string> = {
  demo: 'Demande de démonstration',
  teacher_subscription: 'Souscription enseignant',
  school: 'Offre établissement',
  district: 'Offre multi-établissements',
  support: 'Demande d’aide',
  partnership: 'Proposition de partenariat',
  other: 'Autre demande',
}

export interface ContactEmail {
  replyTo: string
  subject: string
  text: string
}

export function buildContactEmail(input: ContactInput): ContactEmail {
  const reason = REASON_LABELS[input.reason]
  const optionalValue = (value: string) => value || 'Non renseigné'

  return {
    replyTo: input.email,
    subject: `[EducAssist] ${reason} — ${input.name}`,
    text: [
      `Motif : ${reason}`,
      `Nom : ${input.name}`,
      `Email : ${input.email}`,
      `Téléphone : ${optionalValue(input.phone)}`,
      `Établissement / organisation : ${optionalValue(input.organization)}`,
      `Langue du formulaire : ${input.locale}`,
      '',
      'Message :',
      input.message,
    ].join('\n'),
  }
}
