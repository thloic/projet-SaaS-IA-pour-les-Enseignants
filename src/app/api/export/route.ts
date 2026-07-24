import { exportRequestSchema } from '@/features/export/schemas/exportSchema'
import { loadAdaptationVariantExportDocument, loadCourseExportDocument } from '@/features/export/server/exportSource'
import { buildDocx } from '@/features/export/utils/buildDocx'
import { buildPdf } from '@/features/export/utils/buildPdf'
import { getCurrentUser } from '@/features/profile/server/profile'

// @react-pdf/renderer et docx utilisent des API Node (Buffer, etc.), donc pas de runtime edge ici.
export const runtime = 'nodejs'

function slugify(value: string) {
  const slug = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return slug || 'export'
}

export async function POST(req: Request) {
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return Response.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const parsed = exportRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Requête d’export invalide.' },
      { status: 400 }
    )
  }

  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: 'Vous devez être connecté.' }, { status: 401 })
  }

  const { source, sourceId, variantType, format } = parsed.data

  const document =
    source === 'course'
      ? await loadCourseExportDocument(sourceId, user.id)
      : await loadAdaptationVariantExportDocument(sourceId, variantType!, user.id)

  if (!document) {
    return Response.json({ error: 'Ce contenu est introuvable ou pas encore prêt.' }, { status: 404 })
  }

  const buffer = format === 'pdf' ? await buildPdf(document) : await buildDocx(document)
  const contentType =
    format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  const filename = `${slugify(document.title)}.${format}`

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
