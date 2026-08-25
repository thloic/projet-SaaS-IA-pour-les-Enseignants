import type { OwnedStudentRecord } from '../types/memory.types.ts'
import { candidateNames, normalizeName } from './studentContextCore.ts'

export type StudentMentionResult =
  | { kind: 'match'; student: OwnedStudentRecord }
  | { kind: 'ambiguous'; candidates: OwnedStudentRecord[] }
  | { kind: 'none' }

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Position du premier mot-frontiere ou l'un des noms de l'eleve apparait dans
// le message normalise, ou null si aucun ne correspond. Les noms d'un seul
// caractere sont ignores (trop de faux positifs).
function earliestMatchPosition(normalizedMessage: string, student: OwnedStudentRecord): number | null {
  let earliest: number | null = null
  for (const name of candidateNames(student)) {
    if (name.length <= 1) continue
    const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(name)}(?:\\s|$)`, 'u')
    const match = pattern.exec(normalizedMessage)
    if (!match) continue
    const index = match.index + (match[0].startsWith(' ') ? 1 : 0)
    if (earliest === null || index < earliest) earliest = index
  }
  return earliest
}

// Detecte si un message mentionne un eleve reel de l'enseignant, sans mot-cle
// declencheur (contrairement au PAT/bulletin) : la question peut etre posee
// de n'importe quelle facon. Si plusieurs eleves differents sont mentionnes,
// seul le premier (par position dans le texte) est retenu — jamais melanger
// les dossiers de deux eleves dans une meme reponse. Si le nom le plus tot
// mentionne correspond a plusieurs eleves distincts (meme prenom, classes
// differentes), c'est une ambiguite a clarifier plutot qu'un choix silencieux.
export function detectMentionedStudent(
  message: string,
  students: OwnedStudentRecord[]
): StudentMentionResult {
  const normalizedMessage = normalizeName(message)

  const positioned = students
    .map((student) => ({ student, position: earliestMatchPosition(normalizedMessage, student) }))
    .filter((entry): entry is { student: OwnedStudentRecord; position: number } => entry.position !== null)

  if (positioned.length === 0) return { kind: 'none' }

  const minPosition = Math.min(...positioned.map((entry) => entry.position))
  const earliestMatches = positioned.filter((entry) => entry.position === minPosition)

  if (earliestMatches.length > 1) {
    return { kind: 'ambiguous', candidates: earliestMatches.map((entry) => entry.student) }
  }
  return { kind: 'match', student: earliestMatches[0].student }
}
