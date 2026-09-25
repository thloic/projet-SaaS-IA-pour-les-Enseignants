import assert from 'node:assert/strict'
import test from 'node:test'
import { detectMentionedClass } from '../../src/features/agent/server/classMentionDetection.ts'
import { buildClassContext, buildClassErrorAnalysis, calculateClassAverages, numericGrade } from '../../src/features/agent/server/classContextCore.ts'
import { classroom, otherClass, dashboard } from '../fixtures/classContext.ts'

for (const message of ['Effectif de la 8A ?', 'Présences de la classe 8a', 'Classe 8A', 'Quels élèves de 8A ont un plan d’intervention ?']) {
  test(`détection explicite : ${message}`, () => {
    assert.deepEqual(detectMentionedClass(message, [classroom, otherClass]), { kind: 'match', classroom })
  })
}
test('classe unique implicite, ambiguïté, frontières et aucune mention', () => {
  assert.equal(detectMentionedClass('Comment va ma classe ?', [classroom]).kind, 'match')
  assert.deepEqual(detectMentionedClass('Quels élèves sont absents ?', [classroom, otherClass]), { kind: 'ambiguous', candidates: [classroom, otherClass] })
  assert.equal(detectMentionedClass('Bonjour', [classroom]).kind, 'none')
  assert.equal(detectMentionedClass('18A', [classroom]).kind, 'none')
  assert.equal(detectMentionedClass('ma classe', []).kind, 'none')
  assert.equal(detectMentionedClass('Compare 8A et 8B', [classroom, otherClass]).kind, 'ambiguous')
})
test('noms avec accents, ponctuation et homonymes', () => {
  const accented = { ...classroom, name: 'Groupe Étoile' }
  assert.equal(detectMentionedClass('étoile ?', [accented]).kind, 'match')
  assert.equal(detectMentionedClass('8A', [classroom, { ...otherClass, name: classroom.name }]).kind, 'ambiguous')
})
test('notes : barèmes explicites, profil, décimales et rejet strict', () => {
  assert.deepEqual(numericGrade(' 12,5 / 20 ', 'percentage'), { value: 12.5, scale: 20 })
  assert.deepEqual(numericGrade('0', '10'), { value: 0, scale: 10 })
  assert.deepEqual(numericGrade('80%', '20'), { value: 80, scale: 100 })
  for (const grade of ['A', 'Bien', '', '-1', '21/20', '101%', '8/0', '8/30', '12 points', 'NaN']) assert.equal(numericGrade(grade, '20'), null)
  assert.equal(numericGrade('4', 'levels'), null)
  assert.equal(numericGrade('8', 'letter'), null)
})
test('moyenne manuelle normalisée dans le barème enseignant, aucun arrondi intermédiaire', () => {
  const rows = ['15/20', '8/10', '90%'].map((grade, i) => ({ student_id: String(i), title: 'Fractions', grade }))
  assert.deepEqual(calculateClassAverages(rows, '20'), [{ title: 'Fractions', resultCount: 3, status: 'available', average: 16.33, scale: 20 }])
})
test('aucune moyenne partielle pour les lettres et aucun mélange de titres répétés', () => {
  const row = { student_id: '1', title: 'Fractions', grade: '15/20' }
  assert.equal(calculateClassAverages([row, { ...row, student_id: '2', grade: 'A' }], '20')[0].status, 'non_numeric')
  assert.equal(calculateClassAverages([row, row], '20')[0].status, 'ambiguous_evaluation')
  assert.equal(calculateClassAverages([{ ...row, title: null }], '20')[0].average, null)
  assert.deepEqual(calculateClassAverages([], '20'), [])
  assert.equal(calculateClassAverages([row, { ...row, title: 'Lecture', grade: '10/20' }], '20').length, 2)
})
test('projection fidèle au tableau de bord, sans recalcul des signaux', () => {
  const source = dashboard()
  const context = buildClassContext(source, [], '20')
  assert.deepEqual(context.metrics, source.metrics)
  assert.deepEqual(context.students, source.students)
  assert.deepEqual(context.attendance, source.recentAttendance)
  assert.deepEqual(context.recentObservations, source.recentObservations)
  assert.deepEqual(context.participation, { events: 2, score: 3 })
  assert.equal(context.period, '30d')
  assert.deepEqual(context.errorAnalysis, { status: 'no_data', copyCount: 0, categories: [] })
})
test('errorAnalysis du contexte de classe reprend fidèlement les copies de correction fournies', () => {
  const source = dashboard()
  const correctionRows = [
    { status: 'validated' as const, validated_at: `${source.periodRange.start}T00:00:00.000Z`, findings: [{ category: 'syntaxe' as const }] },
  ]
  const context = buildClassContext(source, [], '20', correctionRows)
  assert.deepEqual(context.errorAnalysis, buildClassErrorAnalysis(correctionRows, source.periodRange))
  assert.equal(context.errorAnalysis.status, 'available')
})
test('classe sans activité : conserve les besoins, distingue absence de données et zéro', () => {
  const source = dashboard()
  source.metrics = { ...source.metrics, attendanceRate: null, sessionCount: 0 }
  source.sessions = []; source.recentObservations = []; source.recentAttendance = []
  const context = buildClassContext(source, [], '20')
  assert.equal(context.hasRecentActivity, false)
  assert.equal(context.metrics.attendanceRate, null)
  assert.equal(context.students[0].interventionPlan, true)
})

test('classe inconnue : aucune sélection automatique de la classe unique', () => {
  assert.equal(detectMentionedClass('Présences de la classe 9Z', [classroom]).kind, 'ambiguous')
})

for (const message of ['Quel est le taux de présence ?', 'Combien d’absences ?', 'Moyenne de Lecture ?', 'How is my class doing?']) {
  test(`question collective implicite : ${message}`, () => {
    assert.equal(detectMentionedClass(message, [classroom]).kind, 'match')
    assert.equal(detectMentionedClass(message, [classroom, otherClass]).kind, 'ambiguous')
  })
}
