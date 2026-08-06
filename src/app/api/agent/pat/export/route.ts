import { NextResponse } from 'next/server'

import { PATSchema } from '@/features/agent/schemas/patSchema'
import { exportPATToDocx } from '@/features/agent/utils/exportPATDocx'
import { getCurrentUser } from '@/features/profile/server/profile'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Vous devez être connecté pour exporter ce PAT.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Le PAT à exporter est invalide.' }, { status: 400 })
  }

  const parsed = PATSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Vérifiez les champs du PAT avant l’export.' }, { status: 400 })
  }

  try {
    const docx = await exportPATToDocx(parsed.data)
    return new Response(new Uint8Array(docx), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="plan-appui-temporaire.docx"',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    console.error('[agent:pat] echec export DOCX')
    return NextResponse.json({ error: 'Le document DOCX n’a pas pu être créé.' }, { status: 500 })
  }
}
