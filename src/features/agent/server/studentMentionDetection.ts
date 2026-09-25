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
function bestMatch(normalizedMessage: string, student: OwnedStudentRecord): { position: number; length: number } | null {
  let best: { position: number; length: number } | null = null
  for (const name of candidateNames(student)) {
    if (name.length <= 1) continue
    const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(name)}(?:\\s|$)`, 'u')
    const match = pattern.exec(normalizedMessage)
    if (!match) continue
    const index = match.index + (match[0].startsWith(' ') ? 1 : 0)
    if (
      best === null ||
      index < best.position ||
      (index === best.position && name.length > best.length)
    ) {
      best = { position: index, length: name.length }
    }
  }
  return best
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
    .map((student) => ({ student, match: bestMatch(normalizedMessage, student) }))
    .filter((entry): entry is { student: OwnedStudentRecord; match: { position: number; length: number } } => entry.match !== null)

  if (positioned.length === 0) return { kind: 'none' }

  const minPosition = Math.min(...positioned.map((entry) => entry.match.position))
  const earliestMatches = positioned.filter((entry) => entry.match.position === minPosition)
  const longestMatch = Math.max(...earliestMatches.map((entry) => entry.match.length))
  const mostSpecificMatches = earliestMatches.filter((entry) => entry.match.length === longestMatch)

  if (mostSpecificMatches.length > 1) {
    return { kind: 'ambiguous', candidates: mostSpecificMatches.map((entry) => entry.student) }
  }
  return { kind: 'match', student: mostSpecificMatches[0].student }
}
