import { normalizeName } from './studentContextCore.ts'
import type { ParentEmailRegister } from '../schemas/parentEmailSchema.ts'

// Logique pure de recherche du brouillon de courriel aux parents à relire.
// Aucune donnée n'est envoyée ici : l'envoi reste exclusivement le bouton
// « Envoyer » de la carte (sendParentEmailAction), après relecture humaine.

export interface ParentEmailDraftLookupRow {
  id: string
  studentId: string
  studentFirstName: string
  studentLastName: string
  familyLanguage: string | null
  register: ParentEmailRegister
  subject: string
  body: string
  createdAt: string
  sentAt: string | null
  sentTo: string | null
}

export type ParentEmailDraftLookupResult =
  | { status: 'ready'; draft: ParentEmailDraftLookupRow }
  | { status: 'already_sent'; draft: ParentEmailDraftLookupRow }
  | { status: 'not_found' }

// Le brouillon le plus récent (filtré par élève si un nom est donné). Si ce
// brouillon a déjà été envoyé, on ne propose pas de le renvoyer : l'agent le
// signale à l'enseignant.
export function selectParentEmailDraftToSend(
  rows: ParentEmailDraftLookupRow[],
  studentQuery?: string
): ParentEmailDraftLookupResult {
  const query = studentQuery ? normalizeName(studentQuery) : ''
  const candidates = rows
    .filter((row) => {
      if (!query) return true
      const fullName = normalizeName(`${row.studentFirstName} ${row.studentLastName}`)
      return fullName.includes(query)
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))

  const latest = candidates[0]
  if (!latest) return { status: 'not_found' }
  if (latest.sentAt) return { status: 'already_sent', draft: latest }
  return { status: 'ready', draft: latest }
}
