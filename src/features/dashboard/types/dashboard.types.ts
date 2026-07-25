import type { DashboardPreset } from '@/features/dashboard/schemas/dashboardPeriodSchema'

export interface DashboardPeriod {
  preset: DashboardPreset
  from: string
  to: string
  previousFrom: string
  previousTo: string
}

export interface DashboardMetric {
  key: 'attendance' | 'students' | 'attention' | 'corrections' | 'usage'
  value: number | null
  suffix?: string
  previousValue: number | null
}

export interface DashboardTrendPoint {
  date: string
  attendanceRate: number | null
  courses: number
  quizzes: number
  adaptations: number
  bulletins: number
  corrections: number
}

export interface DashboardDistributionItem {
  key: string
  label: string
  labelEn?: string
  value: number
}

export interface DashboardClassEngagement {
  id: string
  name: string
  studentCount: number
  attendanceRate: number | null
  participations: number
  observations: number
}

export interface DashboardAlert {
  id: string
  target: DashboardMetric['key']
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  titleEn: string
  messageEn: string
  href: string
}

export type DashboardHistoryType =
  | 'course'
  | 'quiz'
  | 'adaptation'
  | 'bulletin'
  | 'correction'
  | 'document'
  | 'session'

export interface DashboardHistoryItem {
  id: string
  type: DashboardHistoryType
  title: string
  subtitle: string
  status: 'complete' | 'generating' | 'failed' | 'info'
  createdAt: string
  href: string
}

export interface CentralDashboardData {
  teacher: {
    firstName: string
    fullName: string
  }
  period: DashboardPeriod
  metrics: DashboardMetric[]
  classCount: number
  sessionCount: number
  trend: DashboardTrendPoint[]
  attendanceDistribution: DashboardDistributionItem[]
  observationDistribution: DashboardDistributionItem[]
  classEngagement: DashboardClassEngagement[]
  correctionWorkload: DashboardDistributionItem[]
  contentCounts: {
    courses: number
    quizzes: number
    adaptations: number
    bulletins: number
    corrections: number
    documents: number
  }
  alerts: DashboardAlert[]
  history: DashboardHistoryItem[]
}
