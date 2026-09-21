import type { ClassDashboardData } from '../../classroom/types/classroomDashboard.types.ts'
import type { CorrectionFindingCategory } from '../../correction/types/correction.types.ts'

export interface OwnedClassRecord {
  id: string
  name: string
  level: string
  subject: string
}

export interface ClassEvaluationAverage {
  title: string | null
  resultCount: number
  status: 'available' | 'non_numeric' | 'ambiguous_evaluation'
  average: number | null
  scale: number | null
}

export interface ClassErrorAnalysisCategory {
  category: CorrectionFindingCategory
  count: number
}

export interface ClassErrorAnalysis {
  status: 'available' | 'no_data'
  copyCount: number
  categories: ClassErrorAnalysisCategory[]
}

export interface ClassContext {
  kind: 'class_context'
  classroom: OwnedClassRecord
  period: '30d'
  periodRange: ClassDashboardData['periodRange']
  hasRecentActivity: boolean
  metrics: ClassDashboardData['metrics']
  participation: { events: number; score: number }
  students: ClassDashboardData['students']
  sessions: ClassDashboardData['sessions']
  attendance: ClassDashboardData['recentAttendance']
  recentObservations: ClassDashboardData['recentObservations']
  evaluations: ClassEvaluationAverage[]
  errorAnalysis: ClassErrorAnalysis
}
