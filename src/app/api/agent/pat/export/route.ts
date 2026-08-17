import { NextResponse } from 'next/server'
import { z } from 'zod'

import { PATSchema } from '@/features/agent/schemas/patSchema'
import { exportPATToDocx } from '@/features/agent/utils/exportPATDocx'
import { getCurrentTeacherProfile, getCurrentUser } from '@/features/profile/server/profile'

const EXPORT_ERRORS = {
  fr: { invalid: 'Vérifiez les champs du PAT avant l’export.', failed: 'Le document DOCX n’a pas pu être créé.' },
  en: { invalid: 'Review the support plan fields before exporting.', failed: 'The DOCX document could not be created.' },
  es: { invalid: 'Revisa los campos del PAT antes de exportarlo.', failed: 'No se ha podido crear el documento DOCX.' },
} as const

const exportRequestSchema = z.union([
  PATSchema.transform((pat) => ({ pat, language: 'fr' as const })),
  z.object({
    pat: PATSchema,
    language: z.enum(['fr', 'en', 'es']),
  }).strict(),
])

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Vous devez être connecté pour exporter ce PAT.' }, { status: 401 })
  }
  const profile = await getCurrentTeacherProfile()
  const errors = EXPORT_ERRORS[profile?.interface_language ?? 'fr']

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Le PAT à exporter est invalide.' }, { status: 400 })
  }

  const parsed = exportRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: errors.invalid }, { status: 400 })
  }

  try {
    const docx = await exportPATToDocx(parsed.data.pat, { language: parsed.data.language })
    return new Response(new Uint8Array(docx), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="plan-appui-temporaire.docx"',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    console.error('[agent:pat] echec export DOCX')
    return NextResponse.json({ error: errors.failed }, { status: 500 })
  }
}
