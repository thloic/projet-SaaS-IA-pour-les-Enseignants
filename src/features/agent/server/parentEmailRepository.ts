import 'server-only'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import type { ParentEmailDraftRecord } from './parentEmailOrchestration.ts'

export async function saveAgentParentEmailDraft(record: ParentEmailDraftRecord): Promise<{ id: string }> {
  const user = await getCurrentUser()
  if (!user) throw new Error('AUTH_REQUIRED')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('parent_email_drafts')
    .insert({
      user_id: user.id,
      student_id: record.studentId,
      class_id: record.classId,
      register: record.register,
      situation: record.situation ?? null,
      subject: record.subject,
      body: record.body,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[agent:parent-email] insertion refusée', error)
    throw new Error('PARENT_EMAIL_DRAFT_SAVE_FAILED')
  }

  revalidatePath('/dashboard', 'layout')
  return { id: data.id }
}

export async function markParentEmailDraftSent(input: {
  draftId: string
  userId: string
  sentTo: string
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('parent_email_drafts')
    .update({ sent_at: new Date().toISOString(), sent_to: input.sentTo })
    .eq('id', input.draftId)
    .eq('user_id', input.userId)

  if (error) {
    console.error('[agent:parent-email] marquage "envoyé" refusé', error)
    throw new Error('PARENT_EMAIL_DRAFT_MARK_SENT_FAILED')
  }
}
