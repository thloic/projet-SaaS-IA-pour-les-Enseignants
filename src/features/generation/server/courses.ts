import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'

export type CourseStatus = 'generating' | 'complete' | 'failed'

export interface CourseRecord {
  id: string
  user_id: string
  title: string
  subject: string
  level: string
  duration_minutes: number
  objectives: string | null
  content_md: string
  status: CourseStatus
  created_at: string
  updated_at: string
}

export type CourseListItem = Omit<CourseRecord, 'content_md' | 'user_id'>

export async function listMyCourses(): Promise<CourseListItem[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, subject, level, duration_minutes, objectives, status, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(12)

  if (error) {
    console.error('[courses] chargement liste refuse', error)
    throw new Error('Impossible de charger vos cours pour le moment.')
  }

  return (data ?? []) as CourseListItem[]
}

export async function getMyCourse(id: string): Promise<CourseRecord | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[courses] chargement detail refuse', error)
    throw new Error('Impossible de charger ce cours pour le moment.')
  }

  return data as CourseRecord | null
}
