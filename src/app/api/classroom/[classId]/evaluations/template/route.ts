import { NextResponse } from 'next/server'

import { listClassStudents } from '@/features/classroom/server/classroom.actions'
import { getCurrentUser } from '@/features/profile/server/profile'

// Echappe une cellule au sens CSV strict (le format impose n'a normalement
// pas besoin de guillemets, mais un nom compose avec virgule doit rester
// valide plutot que de casser silencieusement les colonnes).
function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Vous devez être connecté.' }, { status: 401 })
  }

  const { classId } = await params
  const students = await listClassStudents(classId)

  const lines = [
    'Nom complet,Note',
    ...students.map((student) => `${csvCell(`${student.first_name} ${student.last_name}`.trim())},`),
  ]

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modele-resultats.csv"',
      'Cache-Control': 'private, no-store',
    },
  })
}
