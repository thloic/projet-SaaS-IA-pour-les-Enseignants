import { detectMentionedClass, findNamedClasses, isClassQuestion } from './classMentionDetection.ts'
import { detectMentionedStudent } from './studentMentionDetection.ts'
import { candidateNames, normalizeName } from './studentContextCore.ts'
import { buildClarificationResponse } from './agentResponses.ts'
import type { ClassContext, OwnedClassRecord } from '../types/classContext.types.ts'
import type { OwnedStudentRecord, StudentContext, StudentContextResult } from '../types/memory.types.ts'
import type { AppLocale } from '../../i18n/locale.ts'

interface Dependencies {
  listOwnedClasses(): Promise<OwnedClassRecord[]>
  listOwnedStudents(): Promise<OwnedStudentRecord[]>
  getClassContext(id: string): Promise<ClassContext>
  getStudentContext(input: { studentQuery: string; studentId?: string }): Promise<StudentContextResult>
}

const copy = {
  fr: { clarify: 'De quelle classe parlez-vous ? Précisez une seule classe :', comparison: 'Pour une comparaison nominative, posez votre question sur un seul élève à la fois.', empty: 'Aucune classe enregistrée. Créez une classe pour consulter ses données.' },
  en: { clarify: 'Which class do you mean? Please specify one class:', comparison: 'For a named comparison, please ask about one student at a time.', empty: 'No classes are saved. Create a class to consult its data.' },
  es: { clarify: '¿De qué clase hablas? Indica una sola clase:', comparison: 'Para una comparación nominal, pregunta por un solo alumno a la vez.', empty: 'No hay clases registradas. Crea una clase para consultar sus datos.' },
}

export async function resolveConversationContext(
  messages: Array<{ role: string; content: string }>, language: AppLocale, dependencies: Dependencies,
) {
  const userMessages = messages.filter((message) => message.role === 'user')
  const latest = userMessages.at(-1)?.content ?? ''
  const [classes, students] = await Promise.all([dependencies.listOwnedClasses(), dependencies.listOwnedStudents()])
  const text = ` ${normalizeName(latest)} `
  const namedPositions = students.map((student) => Math.min(...candidateNames(student)
    .filter((name) => name.length > 1 && text.includes(` ${name} `))
    .map((name) => text.indexOf(` ${name} `))))
  const distinctMentions = new Set(namedPositions.filter(Number.isFinite))
  if (distinctMentions.size >= 2 && /\b(compar\w*|versus|vs|meilleur|meilleure|mieux|better|best|differenc\w*|mejor)\b/u.test(text)) {
    return { reply: copy[language].comparison }
  }

  let classMention = detectMentionedClass(latest, classes)
  const studentMention = detectMentionedStudent(latest, students)
  // An individual question such as "les retards de Marie" must not pick an arbitrary class.
  if (studentMention.kind !== 'none' && !/\b(class|classes?|groupes?|clase|classroom|grupo)\b/u.test(text) &&
      findNamedClasses(latest, classes).length === 0) {
    classMention = { kind: 'none' }
  }
  // Only user-authored references establish context; an assistant's suggested class cannot select one.
  if (classMention.kind !== 'match' && findNamedClasses(latest, classes).length === 0 &&
      !/\b(?:classe|class|clase|groupe|grupo)\s+[a-z]*\d/u.test(text) &&
      /^(et\b|and\b|y\b)|\b(cette classe|ce groupe|leur|leurs|its|their|esa clase)\b/u.test(text.trim())) {
    for (const previous of userMessages.slice(0, -1).reverse()) {
      const mention = detectMentionedClass(previous.content, classes)
      if (mention.kind === 'ambiguous') break
      if (mention.kind === 'match') { classMention = mention; break }
    }
  }
  if (classMention.kind === 'ambiguous') {
    return { reply: `${copy[language].clarify}\n${classMention.candidates.map((c) => `- ${c.name} (${c.level}, ${c.subject})`).join('\n')}` }
  }
  if (classes.length === 0 && isClassQuestion(latest) && studentMention.kind === 'none') return { reply: copy[language].empty }

  const scopedStudents = classMention.kind === 'match'
    ? students.filter((student) => student.classes.some((c) => c.id === classMention.classroom.id)) : students
  const mention = detectMentionedStudent(latest, scopedStudents)
  if (mention.kind === 'ambiguous') return { clarification: buildClarificationResponse(mention.candidates, language) }
  let student: StudentContext | undefined
  if (mention.kind === 'match') {
    const resolved = await dependencies.getStudentContext({ studentQuery: mention.student.fullName, studentId: mention.student.id })
    if (resolved?.kind === 'ambiguous') return { clarification: buildClarificationResponse(resolved.candidates, language) }
    if (!resolved) throw new Error('STUDENT_CONTEXT_NOT_FOUND')
    student = resolved
  }
  const classroom = classMention.kind === 'match' ? await dependencies.getClassContext(classMention.classroom.id) : undefined
  return { student, classroom }
}
