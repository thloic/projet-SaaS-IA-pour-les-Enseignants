import assert from 'node:assert/strict'
import test from 'node:test'

import {
  studentNameFromRef,
  toMeetingSummaryDocument,
  toParentEmailDocument,
  type MeetingSummaryRow,
  type ParentEmailDraftRow,
} from '../../src/features/generated-documents/server/generatedDocumentRows.ts'

const STUDENT_ID = '22222222-2222-4222-8222-222222222222'
const profile = { first_name: 'Léa', last_name: 'Tremblay' }

function emailRow(overrides: Partial<ParentEmailDraftRow> = {}): ParentEmailDraftRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    student_id: STUDENT_ID,
    class_id: null,
    register: 'comportement',
    situation: null,
    subject: 'Suivi de Léa',
    body: 'Bonjour,',
    sent_at: null,
    sent_to: null,
    created_at: '2026-11-01T10:00:00.000Z',
    student_profiles: profile,
    ...overrides,
  }
}

test('studentNameFromRef accepte un objet ou un tableau et retire les espaces', () => {
  assert.equal(studentNameFromRef({ first_name: ' Léa ', last_name: 'Tremblay ' }), 'Léa Tremblay')
  assert.equal(studentNameFromRef([profile]), 'Léa Tremblay')
  assert.equal(studentNameFromRef(null), null)
  assert.equal(studentNameFromRef([]), null)
})

test('studentNameFromRef renvoie null pour un nom vide', () => {
  assert.equal(studentNameFromRef({ first_name: ' ', last_name: '' }), null)
})

test('courriel parent : brouillon non envoyé, sans situation si vide', () => {
  const doc = toParentEmailDocument(emailRow())
  assert.ok(doc)
  assert.equal(doc.documentType, 'parent-email')
  assert.equal(doc.studentName, 'Léa Tremblay')
  assert.equal(doc.sentAt, null)
  assert.equal(doc.sentTo, null)
  assert.equal('situation' in doc, false)
})

test('courriel parent : envoyé, avec adresse et date conservées', () => {
  const doc = toParentEmailDocument(emailRow({
    sent_at: '2026-11-02T08:00:00.000Z',
    sent_to: 'parent@example.com',
    situation: 'Retards répétés',
  }))
  assert.ok(doc)
  assert.equal(doc.sentAt, '2026-11-02T08:00:00.000Z')
  assert.equal(doc.sentTo, 'parent@example.com')
  assert.equal(doc.situation, 'Retards répétés')
})

test('courriel parent : écarté si l’élève n’a pas de nom lisible', () => {
  assert.equal(toParentEmailDocument(emailRow({ student_profiles: null })), null)
})

function meetingRow(overrides: Partial<MeetingSummaryRow> = {}): MeetingSummaryRow {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    student_id: STUDENT_ID,
    class_id: null,
    notes: 'Rencontre positive.',
    subjects_discussed: null,
    agreements_reached: null,
    next_steps: null,
    created_at: '2026-11-03T10:00:00.000Z',
    student_profiles: profile,
    ...overrides,
  }
}

test('compte rendu : listes absentes (null) deviennent des listes vides', () => {
  const doc = toMeetingSummaryDocument(meetingRow())
  assert.ok(doc)
  assert.equal(doc.documentType, 'meeting-summary')
  assert.deepEqual(doc.subjectsDiscussed, [])
  assert.deepEqual(doc.agreementsReached, [])
  assert.deepEqual(doc.nextSteps, [])
})

test('compte rendu : listes renseignées conservées telles quelles', () => {
  const doc = toMeetingSummaryDocument(meetingRow({
    subjects_discussed: ['Lecture'],
    agreements_reached: ['Lecture quotidienne 15 min'],
    next_steps: ['Revoir dans 2 semaines'],
  }))
  assert.ok(doc)
  assert.deepEqual(doc.subjectsDiscussed, ['Lecture'])
  assert.deepEqual(doc.agreementsReached, ['Lecture quotidienne 15 min'])
  assert.deepEqual(doc.nextSteps, ['Revoir dans 2 semaines'])
})

test('compte rendu : écarté si l’élève n’a pas de nom lisible', () => {
  assert.equal(toMeetingSummaryDocument(meetingRow({ student_profiles: [] })), null)
})
