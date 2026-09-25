import type { ClassDashboardData } from '../../classroom/types/classroomDashboard.types.ts'
import type { GradingSystem } from '../../profile/types/profile.types.ts'
import type { CorrectionCopyStatus, CorrectionFindingCategory } from '../../correction/types/correction.types.ts'
import type { ClassContext, ClassErrorAnalysis, ClassEvaluationAverage } from '../types/classContext.types.ts'

export interface ClassGradeRecord {
  student_id: string
  title: string | null
  grade: string
}

export interface CorrectionFindingRow {
  status: CorrectionCopyStatus
  validated_at: string | null
  findings: { category: CorrectionFindingCategory }[]
}

export function numericGrade(grade: string, system: GradingSystem): { value: number; scale: number } | null {
  const text = grade.trim().replace(',', '.')
  const match = /^(\d+(?:\.\d+)?)\s*(%|\/\s*(10|20|100))?$/.exec(text)
  if (!match) return null
  const scale = match[2] === '%' ? 100 : match[3] ? Number(match[3])
    : system === 'percentage' ? 100 : system === '10' ? 10 : system === '20' ? 20 : null
  const value = Number(match[1])
  return scale && Number.isFinite(value) && value <= scale ? { value, scale } : null
}

export function calculateClassAverages(rows: ClassGradeRecord[], system: GradingSystem): ClassEvaluationAverage[] {
  const groups = new Map<string | null, ClassGradeRecord[]>()
  for (const row of rows) {
    const title = row.title?.trim() || null
    groups.set(title, [...(groups.get(title) ?? []), row])
  }
  return [...groups].map(([title, results]) => {
    const base = { title, resultCount: results.length, average: null, scale: null }
    // The schema has no evaluation ID: repeated titles for a student cannot safely be combined.
    if (title === null || new Set(results.map((row) => row.student_id)).size !== results.length) {
      return { ...base, status: 'ambiguous_evaluation' }
    }
    const grades = results.map((row) => numericGrade(row.grade, system))
    if (grades.some((grade) => grade === null)) return { ...base, status: 'non_numeric' }
    const scale = system === '20' ? 20 : system === '10' ? 10 : 100
    const average = grades.reduce((sum, grade) => sum + grade!.value / grade!.scale * scale, 0) / grades.length
    return { ...base, status: 'available', average: Math.round(average * 100) / 100, scale }
  })
}

// Une copie ne compte que validée (jamais un brouillon non relu par l'enseignant) et dans la
// même fenêtre de 30 jours que le reste du contexte de classe, pour rester cohérent avec elle.
export function buildClassErrorAnalysis(
  rows: CorrectionFindingRow[],
  periodRange: { start: string; end: string }
): ClassErrorAnalysis {
  const validatedInWindow = rows.filter((row) => {
    if (row.status !== 'validated' || !row.validated_at) return false
    const validatedDate = row.validated_at.slice(0, 10)
    return validatedDate >= periodRange.start && validatedDate <= periodRange.end
  })
  if (validatedInWindow.length === 0) return { status: 'no_data', copyCount: 0, categories: [] }
  const counts = new Map<CorrectionFindingCategory, number>()
  for (const row of validatedInWindow) {
    for (const finding of row.findings) counts.set(finding.category, (counts.get(finding.category) ?? 0) + 1)
  }
  const categories = [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
  return { status: 'available', copyCount: validatedInWindow.length, categories }
}

export function buildClassContext(
  dashboard: ClassDashboardData,
  grades: ClassGradeRecord[],
  system: GradingSystem,
  correctionRows: CorrectionFindingRow[] = []
): ClassContext {
  const { id, name, level, subject } = dashboard.classroom
  return {
    kind: 'class_context', classroom: { id, name, level, subject }, period: '30d',
    periodRange: dashboard.periodRange,
    hasRecentActivity: dashboard.metrics.sessionCount > 0 || dashboard.recentObservations.length > 0 || dashboard.recentAttendance.length > 0,
    metrics: dashboard.metrics,
    participation: {
      events: dashboard.students.reduce((sum, student) => sum + student.participationEvents, 0),
      score: dashboard.students.reduce((sum, student) => sum + student.participationScore, 0),
    },
    students: dashboard.students, sessions: dashboard.sessions,
    attendance: dashboard.recentAttendance,
    recentObservations: dashboard.recentObservations,
    evaluations: calculateClassAverages(grades, system),
    errorAnalysis: buildClassErrorAnalysis(correctionRows, dashboard.periodRange),
  }
}
