import type {
  AdaptationSourceType,
  GeneratedVariant,
  VariantType,
} from '@/features/adaptation/schemas/adaptationSchema'

export type AdaptationStatus = 'generating' | 'complete' | 'partial' | 'failed'
export type VariantStatus = 'pending' | 'generating' | 'complete' | 'failed'

export interface AdaptationSourceOption {
  id: string
  type: 'course' | 'document'
  title: string
  subject?: string
  level?: string
  createdAt: string
}

export interface AdaptationStudentOption {
  id: string
  classId: string
  className: string
  firstName: string
  lastName: string
  needs: string[]
  interventionPlan: boolean
  suggestedVariant: VariantType
}

export interface AdaptationVariantRecord {
  id: string
  user_id: string
  adaptation_set_id: string
  variant_type: VariantType
  content_json: GeneratedVariant | null
  content_md: string
  status: VariantStatus
  error_message: string | null
  prompt_version: string
  created_at: string
  updated_at: string
}

export interface AdaptationSetRecord {
  id: string
  user_id: string
  title: string
  source_type: AdaptationSourceType
  course_id: string | null
  source_document_id: string | null
  source_snapshot: string
  source_hash: string
  subject: string
  level: string
  language: 'fr' | 'en'
  status: AdaptationStatus
  created_at: string
  updated_at: string
}

export interface AdaptationDetail extends AdaptationSetRecord {
  variants: AdaptationVariantRecord[]
  students: Array<{
    id: string
    studentId: string
    firstName: string
    lastName: string
    suggestedVariant: VariantType
  }>
}

export interface AdaptationListItem {
  id: string
  title: string
  subject: string
  level: string
  sourceType: AdaptationSourceType
  status: AdaptationStatus
  createdAt: string
  completedVariants: number
  totalVariants: number
}

export interface SharedAdaptation {
  id: string
  title: string
  subject: string
  level: string
  language: 'fr' | 'en'
  created_at: string
  variants: Array<{
    variant_type: VariantType
    content_json: GeneratedVariant | null
    content_md: string
  }>
}
