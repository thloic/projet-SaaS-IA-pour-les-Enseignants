import type {
  AttendanceRecord,
  ClassRoom,
  ClassSession,
  ParticipationEvent,
  StudentObservation,
  StudentProfile,
} from '@/features/classroom/types/classroom.types'

export type ClassroomPeriod = '7d' | '30d' | '90d'

export interface ClassOverviewItem {
  id: string
  name: string
  level: string
  subject: string
  studentCount: number
  attendanceRate: number | null
  absenceCount: number
  lateCount: number
  attentionCount: number
  activeSessionId: string | null
  lastSessionDate: string | null
}

export interface ClassroomOverviewData {
  classes: ClassOverviewItem[]
  metrics: {
    classCount: number
    studentCount: number
    attendanceRate: number | null
    attentionCount: number
  }
}

export interface AttendanceTrendPoint {
  date: string
  rate: number | null
  present: number
  late: number
  absent: number
  excused: number
}

export interface ClassroomDistributionItem {
  key: string
  label: string
  value: number
}

export interface StudentDashboardRow {
  id: string
  firstName: string
  lastName: string
  needs: string[]
  interventionPlan: boolean
  attendanceRate: number | null
  absenceCount: number
  lateCount: number
  participationScore: number
  participationEvents: number
  latestObservation: {
    tag: string
    category: string
    createdAt: string
  } | null
  signals: string[]
}

export interface ClassSessionSummary {
  id: string
  title: string
  date: string
  endedAt: string | null
  attendanceCount: number
  presentCount: number
  lateCount: number
  absenceCount: number
  participationEvents: number
  observationCount: number
}

export interface RecentClassObservation {
  id: string
  studentId: string
  studentName: string
  tag: string
  category: string
  note: string | null
  createdAt: string
}

export interface ClassDashboardData {
  classroom: ClassRoom
  period: ClassroomPeriod
  metrics: {
    studentCount: number
    attendanceRate: number | null
    absenceCount: number
    lateCount: number
    attentionCount: number
    sessionCount: number
  }
  attendanceTrend: AttendanceTrendPoint[]
  attendanceDistribution: ClassroomDistributionItem[]
  observationDistribution: ClassroomDistributionItem[]
  students: StudentDashboardRow[]
  sessions: ClassSessionSummary[]
  recentObservations: RecentClassObservation[]
  activeSessionId: string | null
}

export interface ActiveClassSessionData {
  classroom: ClassRoom
  session: ClassSession
  students: StudentProfile[]
  attendance: AttendanceRecord[]
  participation: ParticipationEvent[]
  observations: StudentObservation[]
}
