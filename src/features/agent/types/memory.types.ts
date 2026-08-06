import type {
  AttendanceStatus,
  ObservationCategory,
  StudentSex,
} from '@/features/classroom/types/classroom.types'

export interface StudentClassContext {
  id: string
  name: string
  level: string
  subject: string
}

export interface StudentCandidate {
  id: string
  firstName: string
  lastName: string
  fullName: string
  classes: StudentClassContext[]
}

export interface OwnedStudentRecord extends StudentCandidate {
  sex: StudentSex
  familyLanguage: string
  needs: string[]
  institutionalAdaptations: string[]
  interventionPlan: boolean
  generalNotes: string
}

export interface StudentObservationContext {
  id: string
  sessionId: string | null
  category: ObservationCategory
  tag: string
  note: string | null
  createdAt: string
}

export interface StudentParticipationContext {
  id: string
  sessionId: string
  value: -1 | 1 | 2
  label: string
  createdAt: string
}

export interface StudentAttendanceContext {
  id: string
  sessionId: string
  status: AttendanceStatus
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface StudentContentVariantContext {
  id: string
  adaptationSetId: string
  title: string
  subject: string
  level: string
  suggestedVariant: 'standard' | 'support' | 'dys' | 'adhd' | 'enrichment'
  createdAt: string
}

export interface StudentContext {
  kind: 'context'
  student: Omit<OwnedStudentRecord, 'classes' | 'fullName'> & { fullName: string }
  classes: StudentClassContext[]
  observations: StudentObservationContext[]
  participations: StudentParticipationContext[]
  attendance: StudentAttendanceContext[]
  contentVariants: StudentContentVariantContext[]
}

export interface StudentAmbiguity {
  kind: 'ambiguous'
  candidates: StudentCandidate[]
}

export type StudentContextResult = StudentContext | StudentAmbiguity | null
