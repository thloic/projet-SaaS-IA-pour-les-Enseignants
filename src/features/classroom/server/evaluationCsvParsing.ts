import type { StudentProfile } from '../types/classroom.types.ts'

// Format impose, volontairement strict : evite de deviner un format CSV
// arbitraire. Le modele telechargeable produit exactement cet en-tete.
export const EVALUATION_CSV_HEADER = ['nom complet', 'note']

export interface ParsedEvaluationRow {
  line: number
  studentId: string
  grade: string
}

export interface SkippedEvaluationRow {
  line: number
  reason: string
}

export interface ParsedEvaluationCsv {
  headerValid: boolean
  rows: ParsedEvaluationRow[]
  skipped: SkippedEvaluationRow[]
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseCsvLines(text: string): string[][] {
  return text
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')))
}

function matchStudent(name: string, students: StudentProfile[]): StudentProfile | 'ambiguous' | null {
  const normalized = normalizeName(name)
  const matches = students.filter(
    (student) => normalizeName(`${student.first_name} ${student.last_name}`) === normalized
  )
  if (matches.length === 0) return null
  if (matches.length > 1) return 'ambiguous'
  return matches[0]
}

// Associe chaque ligne du CSV a un eleve reel de la classe par nom (pas par
// identifiant technique, le fichier reste lisible par l'enseignant). Une
// ligne qui ne peut pas etre associee de facon unique est ignoree et
// rapportee, jamais bloquante pour le reste du fichier.
export function parseEvaluationCsv(text: string, students: StudentProfile[]): ParsedEvaluationCsv {
  const rows = parseCsvLines(text)
  const header = rows[0]?.map((cell) => cell.toLowerCase())
  const headerValid =
    Boolean(header) && EVALUATION_CSV_HEADER.every((expected, index) => header?.[index] === expected)

  if (!headerValid) return { headerValid: false, rows: [], skipped: [] }

  const skipped: SkippedEvaluationRow[] = []
  const parsed: ParsedEvaluationRow[] = []

  rows.slice(1).forEach(([name, grade], index) => {
    const line = index + 2
    if (!grade?.trim()) {
      skipped.push({ line, reason: 'Note vide' })
      return
    }
    if (!name?.trim()) {
      skipped.push({ line, reason: 'Nom vide' })
      return
    }
    const student = matchStudent(name, students)
    if (student === null) {
      skipped.push({ line, reason: `Aucun élève de cette classe ne correspond à « ${name} »` })
      return
    }
    if (student === 'ambiguous') {
      skipped.push({ line, reason: `Plusieurs élèves correspondent à « ${name} »` })
      return
    }
    parsed.push({ line, studentId: student.id, grade: grade.trim() })
  })

  return { headerValid: true, rows: parsed, skipped }
}
