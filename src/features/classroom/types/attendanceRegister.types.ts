import type { AttendanceStatus, ClassRoom } from './classroom.types.ts'

export interface AttendanceRegisterSession {
  id: string
  title: string
  date: string
  startedAt: string
  endedAt: string | null
  totals: Record<AttendanceStatus | 'unrecorded', number>
}

export interface AttendanceRegisterStudent {
  id: string
  firstName: string
  lastName: string
  statuses: Record<string, AttendanceStatus | 'not_enrolled' | null>
  totals: Record<AttendanceStatus | 'unrecorded', number>
}

export interface AttendanceRegisterData {
  classroom: ClassRoom
  from: string
  to: string
  timeZone: string
  sessions: AttendanceRegisterSession[]
  students: AttendanceRegisterStudent[]
  totals: Record<AttendanceStatus | 'unrecorded', number>
}
