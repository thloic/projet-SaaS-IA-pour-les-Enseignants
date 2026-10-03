import 'server-only'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import type { MeetingSummaryRecord } from './meetingSummaryOrchestration.ts'

export async function saveAgentMeetingSummary(record: MeetingSummaryRecord): Promise<{ id: string }> {
  const user = await getCurrentUser()
  if (!user) throw new Error('AUTH_REQUIRED')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('parent_meeting_summaries')
    .insert({
      user_id: user.id,
      student_id: record.studentId,
      class_id: record.classId,
      notes: record.notes,
      subjects_discussed: record.subjectsDiscussed,
      agreements_reached: record.agreementsReached,
      next_steps: record.nextSteps,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[agent:meeting-summary] insertion refusée', error)
    throw new Error('MEETING_SUMMARY_SAVE_FAILED')
  }

  revalidatePath('/dashboard', 'layout')
  return { id: data.id }
}
