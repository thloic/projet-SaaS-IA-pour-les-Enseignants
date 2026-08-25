import assert from 'node:assert/strict'
import test from 'node:test'
import JSZip from 'jszip'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildAttendanceRegisterDocument } from '../../src/features/classroom/reports/attendanceRegisterDocument.ts'
import type { AttendanceRegisterData } from '../../src/features/classroom/types/attendanceRegister.types.ts'
import { buildDocx } from '../../src/features/export/utils/buildDocxCore.ts'

const data: AttendanceRegisterData = {
  classroom: {
    id: '11111111-1111-4111-8111-111111111111',
    user_id: '22222222-2222-4222-8222-222222222222',
    name: 'Classe fictive Sol',
    level: '2.º de secundaria',
    subject: 'Matemáticas',
    document_template: null,
    document_template_path: null,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  },
  from: '2026-08-24',
  to: '2026-08-25',
  timeZone: 'America/Mexico_City',
  sessions: [
    {
      id: 'session-matin',
      title: 'Cours fictif du matin',
      date: '2026-08-24',
      startedAt: '2026-08-24T14:00:00.000Z',
      endedAt: '2026-08-24T15:00:00.000Z',
      totals: { present: 1, absent: 1, late: 0, excused: 0, unrecorded: 0 },
    },
    {
      id: 'session-apres-midi',
      title: 'Cours fictif de l’après-midi',
      date: '2026-08-24',
      startedAt: '2026-08-24T19:00:00.000Z',
      endedAt: '2026-08-24T20:00:00.000Z',
      totals: { present: 0, absent: 0, late: 1, excused: 0, unrecorded: 1 },
    },
  ],
  students: [
    {
      id: 'student-lina',
      firstName: 'Lina',
      lastName: 'Soler',
      statuses: { 'session-matin': 'present', 'session-apres-midi': 'late' },
      totals: { present: 1, absent: 0, late: 1, excused: 0, unrecorded: 0 },
    },
    {
      id: 'student-noe',
      firstName: 'Noé',
      lastName: 'Darel',
      statuses: { 'session-matin': 'absent', 'session-apres-midi': null },
      totals: { present: 0, absent: 1, late: 0, excused: 0, unrecorded: 1 },
    },
  ],
  totals: { present: 1, absent: 1, late: 1, excused: 0, unrecorded: 1 },
}

test('registre structuré → DOCX paysage ouvrable avec deux séances distinctes le même jour', async () => {
  const document = buildAttendanceRegisterDocument(data, true)
  const buffer = await buildDocx(document)
  assert.equal(buffer.subarray(0, 2).toString('ascii'), 'PK')

  const archive = await JSZip.loadAsync(buffer)
  const xml = await archive.file('word/document.xml')?.async('string')
  const settings = await archive.file('word/document.xml')?.async('string')
  assert.ok(xml)
  assert.ok(settings)
  assert.match(xml, /Registre de présence/)
  assert.match(xml, /Lina/)
  assert.match(xml, /Cours fictif du matin/)
  assert.match(xml, /Cours fictif de l’après-midi/)

  const sectionXml = xml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0] ?? ''
  assert.match(sectionXml, /w:orient="landscape"/)
  assert.match(xml, /<w:tblW w:type="dxa" w:w="13900"\/>/)
})

test('un registre annuel volumineux reste découpé et peut être rendu visuellement', async () => {
  const sessions = Array.from({ length: 17 }, (_, index) => ({
    id: `session-${index + 1}`,
    title: `Cours fictif ${index + 1}`,
    date: `2026-${index < 9 ? '09' : '10'}-${String((index % 9) + 1).padStart(2, '0')}`,
    startedAt: `2026-09-01T${String(13 + (index % 4)).padStart(2, '0')}:00:00.000Z`,
    endedAt: `2026-09-01T${String(14 + (index % 4)).padStart(2, '0')}:00:00.000Z`,
    totals: { present: 12, absent: 2, late: 2, excused: 1, unrecorded: 1 },
  }))
  const statuses = ['present', 'absent', 'late', 'excused', null] as const
  const longData: AttendanceRegisterData = {
    ...data,
    sessions,
    students: Array.from({ length: 18 }, (_, studentIndex) => {
      const studentStatuses = Object.fromEntries(
        sessions.map((session, sessionIndex) => [
          session.id,
          statuses[(studentIndex + sessionIndex) % statuses.length],
        ])
      )
      const values = Object.values(studentStatuses)
      return {
        id: `student-${studentIndex + 1}`,
        firstName: `Prénom${studentIndex + 1}`,
        lastName: `Fictif${studentIndex + 1}`,
        statuses: studentStatuses,
        totals: {
          present: values.filter((value) => value === 'present').length,
          absent: values.filter((value) => value === 'absent').length,
          late: values.filter((value) => value === 'late').length,
          excused: values.filter((value) => value === 'excused').length,
          unrecorded: values.filter((value) => value === null).length,
        },
      }
    }),
  }
  const document = buildAttendanceRegisterDocument(longData, true)
  const buffer = await buildDocx(document)
  const archive = await JSZip.loadAsync(buffer)
  const xml = await archive.file('word/document.xml')?.async('string')

  assert.ok(xml)
  assert.match(xml, /Séances 1 à 8/)
  assert.match(xml, /Séances 9 à 16/)
  assert.match(xml, /Séances 17 à 17/)
  assert.match(xml, /Non renseignés/)

  if (process.env.RENDER_ATTENDANCE_REGISTER === '1') {
    await writeFile(join(tmpdir(), 'educassist-registre-presence.docx'), buffer)
  }
})
