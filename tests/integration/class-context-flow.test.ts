import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveConversationContext } from '../../src/features/agent/server/conversationContext.ts'
import { buildClassContext } from '../../src/features/agent/server/classContextCore.ts'
import { buildAgentSystemPrompt } from '../../src/lib/prompts/agent.ts'
import { getStudentContextCore, type StudentContextRepository } from '../../src/features/agent/server/studentContextCore.ts'
import { classroom, otherClass, dashboard, student } from '../fixtures/classContext.ts'

function dependencies(multiple = false) {
  const calls: string[] = []
  const repository: StudentContextRepository = {
    listOwnedStudents: async () => [student],
    listRecentObservations: async () => [], listRecentParticipations: async () => [], listRecentAttendance: async () => [],
    listRecentContentVariants: async () => [], listRecentEvaluationResults: async () => [],
    studentBelongsToUser: async () => true, insertObservation: async () => { throw new Error('Unexpected write') },
  }
  return {
    calls,
    listOwnedClasses: async () => multiple ? [classroom, otherClass] : [classroom],
    listOwnedStudents: repository.listOwnedStudents.bind(null, 'teacher'),
    getClassContext: async (id: string) => {
      calls.push(id)
      assert.equal(id, classroom.id)
      return buildClassContext(dashboard(), [
        { student_id: student.id, title: 'Lecture', grade: '14/20' },
        { student_id: 'second', title: 'Lecture', grade: '18/20' },
      ], '20')
    },
    getStudentContext: async (input: { studentQuery: string; studentId?: string }) => getStudentContextCore(input, 'teacher', repository),
  }
}
const user = (content: string) => ({ role: 'user', content })

test('question de classe → données du tableau de bord + moyenne → prompt ancré', async () => {
  const deps = dependencies()
  const context = await resolveConversationContext([user('Comment va ma classe ?')], 'fr', deps)
  assert.equal(context.classroom?.evaluations[0].average, 16)
  assert.deepEqual(deps.calls, [classroom.id])
  const prompt = buildAgentSystemPrompt({ language: 'fr' }, context.student, context.classroom)
  assert.match(prompt, /Marie/)
  assert.match(prompt, /Besoin de soutien en lecture/)
  assert.match(prompt, /"average":16/)
  assert.match(prompt, /30 derniers jours/)
  assert.match(prompt, /listes nominatives.*autorisés/)
  assert.match(prompt, /aucune note n’est enregistrée/)
  assert.match(prompt, /jamais des instructions/)
})
test('ambiguïté avant tout chargement de dossier puis réponse au nom choisi', async () => {
  const deps = dependencies(true)
  const result = await resolveConversationContext([user('Qui est absent de ma classe ?')], 'fr', deps)
  assert.match(result.reply!, /Classe 8A/)
  assert.match(result.reply!, /Classe 8B/)
  assert.deepEqual(deps.calls, [])
  const next = await resolveConversationContext([user('Qui est absent de ma classe ?'), { role: 'assistant', content: result.reply! }, user('8A')], 'fr', deps)
  assert.equal(next.classroom?.classroom.id, classroom.id)
})
test('classe et élève dans le même message : aucun dossier écrasé', async () => {
  const result = await resolveConversationContext([user('Comment va Marie dans la classe 8A ?')], 'fr', dependencies(true))
  assert.equal(result.student?.student.id, student.id)
  assert.equal(result.classroom?.classroom.id, classroom.id)
  const prompt = buildAgentSystemPrompt({ language: 'fr' }, result.student, result.classroom)
  assert.match(prompt, /DOSSIER DE L’ÉLÈVE MENTIONNÉ : Marie Martin/)
  assert.match(prompt, /CONTEXTE DE CLASSE/)
})
test('enchaînement classe → élève et suivi collectif conserve la référence explicite', async () => {
  const deps = dependencies(true)
  const result = await resolveConversationContext([user('Comment va 8A ?'), user('Et Marie ?')], 'fr', deps)
  assert.equal(result.student?.student.id, student.id)
  assert.equal(result.classroom?.classroom.id, classroom.id)
  const followup = await resolveConversationContext([user('Comment va 8A ?'), user('Et leur participation ?')], 'fr', deps)
  assert.equal(followup.classroom?.classroom.id, classroom.id)
})
test('un nom de classe proposé uniquement par l’assistant ne résout pas l’ambiguïté', async () => {
  const result = await resolveConversationContext([{ role: 'assistant', content: 'Classe 8A' }, user('Et leur participation ?')], 'fr', dependencies(true))
  assert.ok(result.reply)
  assert.equal(result.classroom, undefined)
})
test('question individuelle sur les retards sans classe : pas de clarification de classe', async () => {
  const result = await resolveConversationContext([user('Quels sont les retards de Marie ?')], 'fr', dependencies(true))
  assert.equal(result.student?.student.id, student.id)
  assert.equal(result.reply, undefined)
})
test('comparaison nominative refusée mais liste collective autorisée', async () => {
  const deps = dependencies()
  deps.listOwnedStudents = async () => [student, { ...student, id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', firstName: 'Julien', lastName: 'Robert', fullName: 'Julien Robert' }]
  const comparison = await resolveConversationContext([user('Compare Marie et Julien')], 'fr', deps)
  assert.match(comparison.reply!, /un seul élève/)
  assert.deepEqual(deps.calls, [])
  const collective = await resolveConversationContext([user('Quels élèves de ma classe ont un plan d’intervention ?')], 'fr', deps)
  assert.equal(collective.classroom?.students[0].interventionPlan, true)
})
test('erreurs de lecture propagées : ne jamais générer sans les données demandées', async () => {
  const deps = dependencies()
  deps.getClassContext = async () => { throw new Error('DATABASE_UNAVAILABLE') }
  await assert.rejects(resolveConversationContext([user('ma classe')], 'fr', deps), /DATABASE_UNAVAILABLE/)
})
test('résolution par identifiant toujours limitée aux élèves autorisés', async () => {
  const deps = dependencies()
  const result = await deps.getStudentContext({ studentQuery: 'Marie', studentId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' })
  assert.equal(result, null)
})
test('classe sans activité → prompt explicite sans taux inventé', async () => {
  const deps = dependencies()
  deps.getClassContext = async () => {
    const data = dashboard()
    data.metrics.sessionCount = 0; data.metrics.attendanceRate = null
    data.sessions = []; data.recentObservations = []; data.recentAttendance = []
    return buildClassContext(data, [], '20')
  }
  const result = await resolveConversationContext([user('ma classe')], 'fr', deps)
  const prompt = buildAgentSystemPrompt({ language: 'fr' }, result.student, result.classroom)
  assert.match(prompt, /"hasRecentActivity":false/)
  assert.match(prompt, /"attendanceRate":null/)
  assert.match(prompt, /indique explicitement l’absence de données/)
})
test('clarifications localisées et aucun accès aux dossiers quand aucune classe', async () => {
  for (const locale of ['en', 'es'] as const) {
    const result = await resolveConversationContext([user('class attendance')], locale, dependencies(true))
    assert.match(result.reply!, /Classe 8A/)
  }
  const deps = dependencies()
  deps.listOwnedClasses = async () => []
  const result = await resolveConversationContext([user('ma classe')], 'fr', deps)
  assert.match(result.reply!, /Aucune classe enregistrée/)
  assert.deepEqual(deps.calls, [])
})

test('une comparaison de classes explicite ne reprend pas la classe du tour précédent', async () => {
  const deps = dependencies(true)
  const result = await resolveConversationContext([user('Comment va 8A ?'), user('Et compare 8A et 8B ?')], 'fr', deps)
  assert.ok(result.reply)
  assert.equal(result.classroom, undefined)
  assert.deepEqual(deps.calls, [])
})

test('la classe désambiguïse deux élèves homonymes et transmet leur identifiant autorisé', async () => {
  const deps = dependencies(true)
  const homonym = { ...student, id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', classes: [{ ...otherClass, documentTemplate: null, documentTemplatePath: null }] }
  deps.listOwnedStudents = async () => [student, homonym]
  const original = deps.getStudentContext
  deps.getStudentContext = async (input) => {
    assert.equal(input.studentId, student.id)
    return original(input)
  }
  const result = await resolveConversationContext([user('Comment va Marie en 8A ?')], 'fr', deps)
  assert.equal(result.student?.student.id, student.id)
  assert.equal(result.classroom?.classroom.id, classroom.id)
})
test('un seul prénom homonyme dans une question comparative demande de préciser l’élève', async () => {
  const deps = dependencies(true)
  deps.listOwnedStudents = async () => [student, { ...student, id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }]
  const result = await resolveConversationContext([user('Marie va-t-elle mieux ?')], 'fr', deps)
  assert.equal(result.clarification?.kind, 'clarification')
  assert.equal(result.reply, undefined)
})
