export type DocumentSourceType = 'text' | 'file'

export interface SourceDocument {
  id: string
  user_id: string
  title: string
  content_text: string
  source_type: DocumentSourceType
  original_filename: string | null
  created_at: string
  updated_at: string
}
