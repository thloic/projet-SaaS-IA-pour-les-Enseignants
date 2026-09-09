import type { ClassDashboardData } from '../../src/features/classroom/types/classroomDashboard.types.ts'
import type { OwnedStudentRecord } from '../../src/features/agent/types/memory.types.ts'

export const classroom = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Classe 8A', level: '8e', subject: 'Français' }
export const otherClass = { ...classroom, id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Classe 8B' }
export const student: OwnedStudentRecord = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', firstName: 'Marie', lastName: 'Martin', fullName: 'Marie Martin',
  classes: [{ ...classroom, documentTemplate: null, documentTemplatePath: null }],
  sex: 'F', familyLanguage: 'fr', needs: ['Lecture'], institutionalAdaptations: [], interventionPlan: true, generalNotes: '',
}
export function dashboard(): ClassDashboardData {
  return {
    classroom: { ...classroom, user_id: 'teacher', document_template: null, document_template_path: null, created_at: '2026-09-01', updated_at: '2026-09-01' },
    period: '30d', periodRange: { start: '2026-08-11', end: '2026-09-09' }, metrics: { studentCount: 1, attendanceRate: 50, absenceCount: 2, lateCount: 1, attentionCount: 1, sessionCount: 4 },
    attendanceTrend: [], attendanceDistribution: [], observationDistribution: [],
    students: [{ id: student.id, firstName: 'Marie', lastName: 'Martin', needs: ['Lecture'], interventionPlan: true,
      attendanceRate: 50, absenceCount: 2, lateCount: 1, participationScore: 3, participationEvents: 2,
      latestObservation: null, signals: ['2 absences sur la période'] }],
    sessions: [{ id: 'session', title: 'Lecture', date: '2026-09-09', endedAt: null, attendanceCount: 1, presentCount: 0, lateCount: 0, absenceCount: 1, participationEvents: 0, observationCount: 1 }],
    recentAttendance: [{ studentId: student.id, studentName: student.fullName, date: '2026-09-09', status: 'absent' }],
    recentObservations: [{ id: 'obs', studentId: student.id, studentName: student.fullName, tag: 'À suivre', category: 'attention', note: 'Besoin de soutien en lecture', createdAt: '2026-09-09' }],
    activeSessionId: null,
  }
}
