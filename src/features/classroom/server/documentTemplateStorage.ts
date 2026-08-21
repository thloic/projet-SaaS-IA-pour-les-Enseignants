import 'server-only'

import { createClient } from '@/lib/supabase/server'

const BUCKET = 'class-document-templates'
export const MAX_TEMPLATE_PDF_BYTES = 10 * 1024 * 1024

function templatePath(userId: string, classId: string): string {
  return `${userId}/${classId}.pdf`
}

export async function uploadClassTemplatePdf(
  userId: string,
  classId: string,
  file: File
): Promise<string> {
  const supabase = await createClient()
  const path = templatePath(userId, classId)

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: 'application/pdf',
  })

  if (error) {
    console.error('[classroom] televersement du modele PDF refuse', error)
    throw new Error('TEMPLATE_PDF_UPLOAD_FAILED')
  }

  return path
}

export async function deleteClassTemplatePdf(userId: string, classId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKET).remove([templatePath(userId, classId)])

  if (error) {
    console.error('[classroom] suppression du modele PDF refusee', error)
    throw new Error('TEMPLATE_PDF_DELETE_FAILED')
  }
}

export async function downloadClassTemplatePdfBase64(path: string): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from(BUCKET).download(path)

  if (error || !data) {
    console.error('[classroom] lecture du modele PDF refusee', error)
    throw new Error('TEMPLATE_PDF_DOWNLOAD_FAILED')
  }

  const buffer = Buffer.from(await data.arrayBuffer())
  return buffer.toString('base64')
}
