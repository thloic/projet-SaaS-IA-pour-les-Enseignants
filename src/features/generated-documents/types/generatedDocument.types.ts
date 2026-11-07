import type { PAT } from '@/features/agent/schemas/patSchema'
import type { ParentEmailRegister } from '@/features/agent/schemas/parentEmailSchema'
import type { BulletinTone } from '@/features/bulletin/schemas/bulletinSchema'
import type { ContentLanguage } from '@/features/i18n/locale'

export interface StoredPATDocument {
  documentType: 'pat'
  id: string
  studentId: string
  classId: string | null
  language: ContentLanguage
  pat: PAT
  createdAt: string
}

export interface StoredBulletinDocument {
  documentType: 'bulletin'
  id: string
  studentId: string
  studentName: string
  classId: string | null
  subject: string
  grade: string
  observations?: string
  tone: BulletinTone
  comment: string
  createdAt: string
}

export interface StoredParentEmailDocument {
  documentType: 'parent-email'
  id: string
  studentId: string
  studentName: string
  classId: string | null
  register: ParentEmailRegister
  situation?: string
  subject: string
  body: string
  sentAt: string | null
  sentTo: string | null
  createdAt: string
}

export interface StoredMeetingSummaryDocument {
  documentType: 'meeting-summary'
  id: string
  studentId: string
  studentName: string
  classId: string | null
  notes: string
  subjectsDiscussed: string[]
  agreementsReached: string[]
  nextSteps: string[]
  createdAt: string
}

export type StoredGeneratedDocument =
  | StoredPATDocument
  | StoredBulletinDocument
  | StoredParentEmailDocument
  | StoredMeetingSummaryDocument

export type GeneratedDocumentHistoryItem =
  | (StoredPATDocument & { studentName: string })
  | StoredBulletinDocument
  | StoredParentEmailDocument
  | StoredMeetingSummaryDocument

export type NewGeneratedDocument =
  | {
      documentType: 'pat'
      studentId: string
      classId: string | null
      language: ContentLanguage
      pat: PAT
    }
  | {
      documentType: 'bulletin'
      studentId: string
      studentName: string
      classId: string
      subject: string
      grade: string
      observations?: string
      tone: BulletinTone
      comment: string
    }
