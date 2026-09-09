import type { ClassroomPeriod } from '../types/classroomDashboard.types.ts'

const DAYS: Record<ClassroomPeriod, number> = { '7d': 7, '30d': 30, '90d': 90 }

export function classroomPeriodBounds(period: ClassroomPeriod, now = new Date()) {
  const start = new Date(now)
  start.setUTCDate(start.getUTCDate() - (DAYS[period] - 1))
  return { start: start.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) }
}
