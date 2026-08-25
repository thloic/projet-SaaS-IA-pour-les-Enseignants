import type { AttendanceRegisterData } from '../types/attendanceRegister.types.ts'
import type { AttendanceStatus } from '../types/classroom.types.ts'
import type { ExportDocument } from '../../export/types/export.types.ts'

const STATUS_LABELS: Record<AttendanceStatus | 'unrecorded' | 'not_enrolled', string> = {
  present: 'P',
  absent: 'A',
  late: 'R',
  excused: 'E',
  unrecorded: 'NR',
  not_enrolled: '—',
}

const SESSION_CHUNK_SIZE = 8

function formatDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: 'UTC',
  })
}

function formatTime(value: string, timeZone: string) {
  return new Date(value).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
}

export function buildAttendanceRegisterDocument(
  data: AttendanceRegisterData,
  includeNames: boolean
): ExportDocument {
  const blocks: ExportDocument['blocks'] = [
    {
      type: 'paragraph',
      text: 'Légende : P = présent, A = absent, R = retard, E = absence excusée, NR = non renseigné, — = hors de la classe.',
    },
  ]

  if (data.sessions.length === 0) {
    blocks.push({ type: 'paragraph', text: 'Aucune séance enregistrée sur cette période.' })
  }

  for (let offset = 0; offset < data.sessions.length; offset += SESSION_CHUNK_SIZE) {
    const sessions = data.sessions.slice(offset, offset + SESSION_CHUNK_SIZE)
    blocks.push(
      {
        type: 'heading2',
        text: `Séances ${offset + 1} à ${offset + sessions.length}`,
      },
      {
        type: 'table',
        headers: [
          'Élève',
          ...sessions.map((session) => `${formatDate(session.date)}\n${formatTime(session.startedAt, data.timeZone)}`),
        ],
        columnWidths: [24, ...sessions.map(() => 76 / sessions.length)],
        rows: data.students.map((student, index) => [
          includeNames
            ? `${student.firstName} ${student.lastName}`.trim()
            : `Élève ${String(index + 1).padStart(2, '0')}`,
          ...sessions.map((session) => STATUS_LABELS[student.statuses[session.id] ?? 'unrecorded']),
        ]),
      }
    )
  }

  blocks.push(
    { type: 'heading1', text: 'Totaux par élève' },
    {
      type: 'table',
      headers: ['Élève', 'Présences', 'Absences', 'Retards', 'Excusées', 'Non renseignés'],
      columnWidths: [30, 14, 14, 12, 14, 16],
      rows: data.students.map((student, index) => [
        includeNames
          ? `${student.firstName} ${student.lastName}`.trim()
          : `Élève ${String(index + 1).padStart(2, '0')}`,
        String(student.totals.present),
        String(student.totals.absent),
        String(student.totals.late),
        String(student.totals.excused),
        String(student.totals.unrecorded),
      ]),
    },
    { type: 'heading1', text: 'Détail des séances' },
    {
      type: 'table',
      headers: ['Date et heure', 'Titre', 'P', 'A', 'R', 'E', 'NR'],
      columnWidths: [18, 42, 8, 8, 8, 8, 8],
      rows: data.sessions.map((session) => [
        `${formatDate(session.date)} ${formatTime(session.startedAt, data.timeZone)}`,
        session.title,
        String(session.totals.present),
        String(session.totals.absent),
        String(session.totals.late),
        String(session.totals.excused),
        String(session.totals.unrecorded),
      ]),
    },
    {
      type: 'paragraph',
      text: 'Les statuts non renseignés ne sont jamais transformés automatiquement en absences.',
    }
  )

  return {
    title: `Registre de présence — ${data.classroom.name}`,
    meta: [
      data.classroom.level,
      data.classroom.subject,
      `${formatDate(data.from)} au ${formatDate(data.to)}`,
      `${data.sessions.length} séance${data.sessions.length > 1 ? 's' : ''}`,
    ],
    blocks,
    dysLayout: false,
    orientation: 'landscape',
  }
}
