import type { OwnedClassRecord } from '../types/classContext.types.ts'
import { normalizeName } from './studentContextCore.ts'

export type ClassMentionResult =
  | { kind: 'match'; classroom: OwnedClassRecord }
  | { kind: 'ambiguous'; candidates: OwnedClassRecord[] }
  | { kind: 'none' }

export function isClassQuestion(message: string): boolean {
  return /\b(class|classes?|groupes?|groups?|effectif|eleves|absents?|absences?|retards?|presences?|participation|observations?|moyenne|intervention|students|classroom|attendance|average|grupo|alumnos|clase|promedio)\b/u.test(normalizeName(message))
}

export function findNamedClasses(message: string, classes: OwnedClassRecord[]): OwnedClassRecord[] {
  const text = ` ${normalizeName(message)} `
  return classes.filter((classroom) => {
    const name = normalizeName(classroom.name)
    const shortName = name.replace(/^(classe|class|clase|groupe|grupo) /u, '')
    return [name, shortName].some((alias) => alias.length > 1 && text.includes(` ${alias} `))
  })
}

export function detectMentionedClass(message: string, classes: OwnedClassRecord[]): ClassMentionResult {
  const matches = findNamedClasses(message, classes)
  if (matches.length === 1) return { kind: 'match', classroom: matches[0] }
  if (matches.length > 1) return { kind: 'ambiguous', candidates: matches }
  if (!isClassQuestion(message) || classes.length === 0) return { kind: 'none' }
  // A requested unknown class code must never silently select the sole owned class.
  if (/\b(?:classe|class|clase|groupe|grupo)\s+(?:[a-z]*\d+[a-z0-9]*)\b/u.test(normalizeName(message))) {
    return { kind: 'ambiguous', candidates: classes }
  }
  if (classes.length === 1) return { kind: 'match', classroom: classes[0] }
  return { kind: 'ambiguous', candidates: classes }
}
