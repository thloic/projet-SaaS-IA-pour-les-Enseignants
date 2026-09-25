import assert from 'node:assert/strict'
import test from 'node:test'

import { attendanceRegisterRangeSchema } from '../../src/features/classroom/schemas/attendanceRegisterSchema.ts'
import { buildAttendanceRegisterDocument } from '../../src/features/classroom/reports/attendanceRegisterDocument.ts'
import type { AttendanceRegisterData } from '../../src/features/classroom/types/attendanceRegister.types.ts'
import {
  buildSessionStartMetadata,
  isSessionStale,
} from '../../src/features/classroom/utils/sessionLifecycle.ts'
import { dateInTimeZone, isValidTimeZone } from '../../src/lib/timezone.ts'

function fixture(sessionCount = 2): AttendanceRegisterData {
  const sessions = Array.from({ length: sessionCount }, (_, index) => ({
    id: `session-${index + 1}`,
    title: `Cours fictif ${index + 1}`,
    date: `2026-09-${String(index + 1).padStart(2, '0')}`,
    startedAt: `2026-09-${String(index + 1).padStart(2, '0')}T14:00:00.000Z`,
    endedAt: `2026-09-${String(index + 1).padStart(2, '0')}T15:00:00.000Z`,
    totals: { present: 1, absent: 0, late: 0, excused: 0, unrecorded: 1 },
  }))
  return {
    classroom: {
      id: '11111111-1111-4111-8111-111111111111',
      user_id: '22222222-2222-4222-8222-222222222222',
      name: 'Classe fictive 8A',
      level: '8e année',
      subject: 'Mathématiques',
      document_template: null,
      document_template_path: null,
      correction_rubric: null,
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
    },
    from: '2026-08-01',
    to: '2027-07-31',
    timeZone: 'America/Mexico_City',
    sessions,
    students: [
      {
        id: 'student-1',
        firstName: 'Lina',
        lastName: 'Soler',
        statuses: Object.fromEntries(sessions.map((session) => [session.id, 'present' as const])),
        totals: { present: sessionCount, absent: 0, late: 0, excused: 0, unrecorded: 0 },
      },
      {
        id: 'student-2',
        firstName: 'Noé',
        lastName: 'Darel',
        statuses: Object.fromEntries(sessions.map((session) => [session.id, null])),
        totals: { present: 0, absent: 0, late: 0, excused: 0, unrecorded: sessionCount },
      },
    ],
    totals: { present: sessionCount, absent: 0, late: 0, excused: 0, unrecorded: sessionCount },
  }
}

test('le fuseau horaire produit la bonne journée locale aux frontières UTC', () => {
  const instant = new Date('2026-08-26T01:30:00.000Z')
  assert.equal(dateInTimeZone(instant, 'Africa/Lome'), '2026-08-26')
  assert.equal(dateInTimeZone(instant, 'America/Mexico_City'), '2026-08-25')
  assert.equal(isValidTimeZone('America/Toronto'), true)
  assert.equal(isValidTimeZone('Fuseau/Inexistant'), false)
})

test('les métadonnées de séance distinguent le titre et détectent une séance ancienne', () => {
  const now = new Date('2026-08-26T01:30:00.000Z')
  const custom = buildSessionStartMetadata({ now, timeZone: 'America/Mexico_City', title: '  Fractions  ' })
  const automatic = buildSessionStartMetadata({ now, timeZone: 'Africa/Lome' })

  assert.deepEqual(custom, { sessionDate: '2026-08-25', title: 'Fractions' })
  assert.equal(automatic.sessionDate, '2026-08-26')
  assert.match(automatic.title, /Séance du/)
  assert.equal(isSessionStale('2026-08-25', now, 'America/Mexico_City'), false)
  assert.equal(isSessionStale('2026-08-24', now, 'America/Mexico_City'), true)
})

test('la période du registre est stricte, ordonnée et limitée à 18 mois', () => {
  assert.equal(attendanceRegisterRangeSchema.safeParse({ from: '2026-08-01', to: '2027-07-31' }).success, true)
  assert.equal(attendanceRegisterRangeSchema.safeParse({ from: '2026-09-01', to: '2026-08-01' }).success, false)
  assert.equal(attendanceRegisterRangeSchema.safeParse({ from: '2025-01-01', to: '2027-01-01' }).success, false)
  assert.equal(attendanceRegisterRangeSchema.safeParse({ from: '2026-08-01', to: '2026-09-01', extra: true }).success, false)
})

test('le registre conserve les non-renseignés et découpe les séances longues sans écraser les colonnes', () => {
  const document = buildAttendanceRegisterDocument(fixture(17), true)
  const tables = document.blocks.filter((block) => block.type === 'table')
  const sessionTables = tables.slice(0, 3)

  assert.equal(document.orientation, 'landscape')
  assert.equal(sessionTables.length, 3)
  assert.deepEqual(sessionTables.map((table) => table.headers.length), [9, 9, 2])
  assert.equal(sessionTables[0].rows[1][1], 'NR')
  const lastBlock = document.blocks.at(-1)
  assert.match(lastBlock?.type === 'paragraph' ? lastBlock.text : '', /jamais transformés automatiquement/)
})

test('le registre anonymisé ne contient aucun nom fictif', () => {
  const document = buildAttendanceRegisterDocument(fixture(), false)
  const serialized = JSON.stringify(document)
  assert.doesNotMatch(serialized, /Lina|Soler|Noé|Darel/)
  assert.match(serialized, /Élève 01/)
})
