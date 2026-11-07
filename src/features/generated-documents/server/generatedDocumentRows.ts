import type {
  StoredMeetingSummaryDocument,
  StoredParentEmailDocument,
} from '@/features/generated-documents/types/generatedDocument.types'

// Transformation pure des lignes Supabase (courriels parents, comptes rendus
// de rencontre) en documents de l'historique. Sans accès réseau ni base :
// testable directement. Une ligne sans nom d'élève lisible est écartée.

export type StudentProfileRef =
  | { first_name: string; last_name: string }
  | Array<{ first_name: string; last_name: string }>
  | null

export interface ParentEmailDraftRow {
  id: string
  student_id: string
  class_id: string | null
  register: 'comportement' | 'echec' | 'plagiat' | 'autre'
  situation: string | null
  subject: string
  body: string
  sent_at: string | null
  sent_to: string | null
  created_at: string
  student_profiles: StudentProfileRef
}

export interface MeetingSummaryRow {
  id: string
  student_id: string
  class_id: string | null
  notes: string
  subjects_discussed: string[] | null
  agreements_reached: string[] | null
  next_steps: string[] | null
  created_at: string
  student_profiles: StudentProfileRef
}

export function studentNameFromRef(ref: StudentProfileRef): string | null {
  const student = Array.isArray(ref) ? ref[0] : ref
  if (!student) return null
  const name = [student.first_name, student.last_name]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
  return name || null
}

export function toParentEmailDocument(row: ParentEmailDraftRow): StoredParentEmailDocument | null {
  const studentName = studentNameFromRef(row.student_profiles)
  if (!studentName) return null
  return {
    documentType: 'parent-email',
    id: row.id,
    studentId: row.student_id,
    studentName,
    classId: row.class_id,
    register: row.register,
    ...(row.situation ? { situation: row.situation } : {}),
    subject: row.subject,
    body: row.body,
    sentAt: row.sent_at,
    sentTo: row.sent_to,
    createdAt: row.created_at,
  }
}

export function toMeetingSummaryDocument(row: MeetingSummaryRow): StoredMeetingSummaryDocument | null {
  const studentName = studentNameFromRef(row.student_profiles)
  if (!studentName) return null
  return {
    documentType: 'meeting-summary',
    id: row.id,
    studentId: row.student_id,
    studentName,
    classId: row.class_id,
    notes: row.notes,
    subjectsDiscussed: row.subjects_discussed ?? [],
    agreementsReached: row.agreements_reached ?? [],
    nextSteps: row.next_steps ?? [],
    createdAt: row.created_at,
  }
}
