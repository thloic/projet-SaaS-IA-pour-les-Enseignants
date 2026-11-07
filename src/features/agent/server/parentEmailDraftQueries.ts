import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { ParentEmailDraftLookupRow } from './parentEmailDraftLookup.ts'
import type { ParentEmailRegister } from '../schemas/parentEmailSchema.ts'

interface RawDraftRow {
  id: string
  student_id: string
  register: ParentEmailRegister
  subject: string
  body: string
  created_at: string
  sent_at: string | null
  sent_to: string | null
  student_profiles:
    | { first_name: string; last_name: string; family_language: string | null }
    | { first_name: string; last_name: string; family_language: string | null }[]
    | null
}

// Lecture seule des brouillons de l'enseignant connecté (RLS + filtre user_id).
export async function listRecentParentEmailDraftsForUser(
  userId: string,
  limit = 50
): Promise<ParentEmailDraftLookupRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('parent_email_drafts')
    .select(
      'id, student_id, register, subject, body, created_at, sent_at, sent_to, student_profiles(first_name, last_name, family_language)'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[agent:parent-email] lecture des brouillons refusée', error)
    throw new Error('PARENT_EMAIL_DRAFT_LIST_FAILED')
  }

  return ((data ?? []) as unknown as RawDraftRow[]).map((row) => {
    const profile = Array.isArray(row.student_profiles) ? row.student_profiles[0] : row.student_profiles
    return {
      id: row.id,
      studentId: row.student_id,
      studentFirstName: profile?.first_name ?? '',
      studentLastName: profile?.last_name ?? '',
      familyLanguage: profile?.family_language ?? null,
      register: row.register,
      subject: row.subject,
      body: row.body,
      createdAt: row.created_at,
      sentAt: row.sent_at,
      sentTo: row.sent_to,
    }
  })
}
