import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { PATSchema } from '@/features/agent/schemas/patSchema'
import { exportPATToDocx } from '@/features/agent/utils/exportPATDocx'
import { getCurrentTeacherProfile, getCurrentUser } from '@/features/profile/server/profile'

const EXPORT_ERRORS = {
  fr: { notFound: 'Ce PAT est introuvable.', failed: 'Le document DOCX n’a pas pu être créé.' },
  en: { notFound: 'This support plan could not be found.', failed: 'The DOCX document could not be created.' },
  es: { notFound: 'No se ha encontrado este PAT.', failed: 'No se ha podido crear el documento DOCX.' },
} as const

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Vous devez être connecté pour exporter ce PAT.' }, { status: 401 })
  }
  const profile = await getCurrentTeacherProfile()
  const errors = EXPORT_ERRORS[profile?.interface_language ?? 'fr']

  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pat_generations')
    .select('pat, language')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: errors.notFound }, { status: 404 })
  }

  const parsedPat = PATSchema.safeParse(data.pat)
  if (!parsedPat.success) {
    console.error('[agent:pat] PAT stocké invalide', parsedPat.error.flatten())
    return NextResponse.json({ error: errors.failed }, { status: 500 })
  }

  try {
    const docx = await exportPATToDocx(parsedPat.data, { language: data.language })
    return new Response(new Uint8Array(docx), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="plan-appui-temporaire.docx"',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    console.error('[agent:pat] echec export DOCX depuis l’historique')
    return NextResponse.json({ error: errors.failed }, { status: 500 })
  }
}
