export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'
export type ObservationCategory =
  | 'behavior'
  | 'effort'
  | 'attention'
  | 'homework'
  | 'progress'
  | 'other'

export interface ClassRoom {
  id: string
  user_id: string
  name: string
  level: string
  subject: string
  created_at: string
  updated_at: string
}

export interface StudentProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  needs: string[]
  language: string
  created_at: string
  updated_at: string
}

export interface ClassStudent {
  id: string
  user_id: string
  class_id: string
  student_id: string
  student_profiles?: StudentProfile
}

export interface ClassSession {
  id: string
  user_id: string
  class_id: string
  title: string
  session_date: string
  started_at: string
  ended_at: string | null
  created_at: string
}

export interface AttendanceRecord {
  id: string
  user_id: string
  session_id: string
  student_id: string
  status: AttendanceStatus
  note: string | null
  created_at: string
  updated_at: string
}

export interface ParticipationEvent {
  id: string
  user_id: string
  session_id: string
  student_id: string
  value: -1 | 1 | 2
  label: string
  created_at: string
}

export interface StudentObservation {
  id: string
  user_id: string
  session_id: string
  student_id: string
  category: ObservationCategory
  tag: string
  note: string | null
  created_at: string
}
