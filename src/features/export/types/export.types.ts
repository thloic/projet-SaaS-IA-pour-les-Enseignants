export type ExportBlock =
  | { type: 'heading1'; text: string }
  | { type: 'heading2'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][]; columnWidths?: number[] }

export interface ExportDocument {
  title: string
  meta: string[]
  blocks: ExportBlock[]
  dysLayout: boolean
  orientation?: 'portrait' | 'landscape'
}

export type ExportFormat = 'pdf' | 'docx'
export type ExportSource = 'course' | 'adaptation_variant' | 'classroom' | 'attendance_register'
