import assert from 'node:assert/strict'
import test from 'node:test'

import {
  selectParentEmailDraftToSend,
  type ParentEmailDraftLookupRow,
} from '../../src/features/agent/server/parentEmailDraftLookup.ts'

function row(overrides: Partial<ParentEmailDraftLookupRow> = {}): ParentEmailDraftLookupRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    studentId: '22222222-2222-4222-8222-222222222222',
    studentFirstName: 'Léa',
    studentLastName: 'Tremblay',
    familyLanguage: 'fr',
    register: 'comportement',
    subject: 'Suivi de Léa',
    body: 'Bonjour,',
    createdAt: '2026-11-01T10:00:00.000Z',
    sentAt: null,
    sentTo: null,
    ...overrides,
  }
}

test('retourne le brouillon le plus récent non envoyé', () => {
  const older = row({ id: 'older', createdAt: '2026-10-01T10:00:00.000Z' })
  const newer = row({ id: 'newer', createdAt: '2026-11-05T10:00:00.000Z' })
  const result = selectParentEmailDraftToSend([older, newer])
  assert.equal(result.status, 'ready')
  if (result.status === 'ready') assert.equal(result.draft.id, 'newer')
})

test('ne propose jamais de renvoyer un brouillon déjà envoyé', () => {
  const sent = row({ sentAt: '2026-11-02T08:00:00.000Z', sentTo: 'parent@example.com' })
  const result = selectParentEmailDraftToSend([sent])
  assert.equal(result.status, 'already_sent')
  if (result.status === 'already_sent') assert.equal(result.draft.sentTo, 'parent@example.com')
})

test('le brouillon le plus récent envoyé bloque la proposition, même si un plus ancien existe', () => {
  const olderUnsent = row({ id: 'older', createdAt: '2026-10-01T10:00:00.000Z' })
  const newerSent = row({ id: 'newer', createdAt: '2026-11-05T10:00:00.000Z', sentAt: '2026-11-05T11:00:00.000Z' })
  assert.equal(selectParentEmailDraftToSend([olderUnsent, newerSent]).status, 'already_sent')
})

test('filtre par élève sans tenir compte des accents ni de la casse', () => {
  const lea = row({ id: 'lea' })
  const marc = row({ id: 'marc', studentFirstName: 'Marc', studentLastName: 'Dubois', studentId: '33333333-3333-4333-8333-333333333333' })
  const result = selectParentEmailDraftToSend([lea, marc], 'LEA')
  assert.equal(result.status, 'ready')
  if (result.status === 'ready') assert.equal(result.draft.id, 'lea')
})

test('not_found quand aucun brouillon ne correspond à l’élève demandé', () => {
  const result = selectParentEmailDraftToSend([row()], 'Inconnu')
  assert.equal(result.status, 'not_found')
})

test('not_found quand l’enseignant n’a encore aucun brouillon', () => {
  assert.equal(selectParentEmailDraftToSend([]).status, 'not_found')
})
