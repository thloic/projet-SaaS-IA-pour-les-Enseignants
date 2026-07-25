import type { CorrectionFindingCategory, CorrectionTone } from '@/features/correction/schemas/correctionSchema'

export type CorrectionBatchStatus = 'draft' | 'generating' | 'partial' | 'complete'
export type CorrectionCopyStatus = 'pending' | 'generating' | 'complete' | 'failed' | 'validated'
export type { CorrectionFindingCategory }

export interface CorrectionBatch {
  id: string
  user_id: string
  class_id: string
  tone: CorrectionTone | null
  status: CorrectionBatchStatus
  created_at: string
  updated_at: string
}

export interface CorrectionFinding {
  category: CorrectionFindingCategory
  excerpt: string
  suggestion: string
}

export interface CorrectionCopy {
  id: string
  user_id: string
  batch_id: string
  student_id: string
  content_text: string
  findings: CorrectionFinding[]
  comment: string | null
  status: CorrectionCopyStatus
  validated_at: string | null
  created_at: string
  updated_at: string
}
