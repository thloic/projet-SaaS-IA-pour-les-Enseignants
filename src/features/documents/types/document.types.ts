export type DocumentSourceType = 'text' | 'file'
export type DocumentFileType = 'txt' | 'pdf' | 'docx'

export interface SourceDocument {
  id: string
  user_id: string
  title: string
  content_text: string
  source_type: DocumentSourceType
  original_filename: string | null
  file_type: DocumentFileType | null
  created_at: string
  updated_at: string
}

// La liste n'a pas besoin du contenu complet (potentiellement jusqu'à 20 000
// caractères par document) — il est chargé à la demande quand on déplie.
export type SourceDocumentListItem = Omit<SourceDocument, 'content_text'>
