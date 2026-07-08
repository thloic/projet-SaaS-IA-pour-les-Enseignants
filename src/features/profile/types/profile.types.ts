export type GradingSystem = '20' | '10' | 'letter' | 'percentage' | 'letter_ca' | 'levels'
export type ContentLanguage = 'fr' | 'en'

export interface TeacherProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  country: string
  subject: string
  subjects: string[]
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

export function normalizeGradingSystem(value: unknown): GradingSystem {
  return value === '10' ||
    value === 'letter' ||
    value === 'percentage' ||
    value === 'letter_ca' ||
    value === 'levels'
    ? value
    : '20'
}

// Limitation connue : le primaire ontarien utilise lettres/niveaux, pas le pourcentage.
//  On suggère 'percentage' par défaut pour tout le Canada (suggestion surchargeable).
//  Affinage par niveau scolaire à traiter ultérieurement.
export function defaultGrading(country: string): GradingSystem {
  if (country.startsWith('Canada')) return 'percentage'
  if (country === 'France') return '20'
  return '20'
}
