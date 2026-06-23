export type GradingSystem = '20' | '10' | 'letter'
export type ContentLanguage = 'fr' | 'en'

export interface TeacherProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  country: string
  subject: string
  levels: string[]
  grading_system: GradingSystem
  language: ContentLanguage
  style_notes: string | null
  created_at: string
  updated_at: string
}

export interface TeacherIdentity {
  name: string
  initials: string
  subject: string
  level: string
  country: string
  plan: 'free' | 'pro'
  generationsUsed: number
  generationsLimit: number
}
