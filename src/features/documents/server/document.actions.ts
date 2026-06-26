'use server'

import { revalidatePath } from 'next/cache'
import { extractText, getDocumentProxy } from 'unpdf'
import mammoth from 'mammoth'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import { documentSchema } from '@/features/documents/schemas/documentSchema'
import type { DocumentFileType } from '@/features/documents/types/document.types'

export interface DocumentActionState {
  error: string | null
}

const MAX_CONTENT_LENGTH = 20000
const MAX_DOCX_SIZE = 8 * 1024 * 1024
const MAX_PDF_SIZE = 8 * 1024 * 1024 // 8 Mo — un PDF pèse plus lourd qu'un .txt pour un volume de texte équivalent

export interface ExtractDocumentState {
  text: string | null
  error: string | null
  warning: string | null
  fileType: DocumentFileType | null
}

function truncateText(text: string) {
  const trimmed = text.trim()
  if (trimmed.length <= MAX_CONTENT_LENGTH) {
    return { text: trimmed, warning: null }
  }

  return {
    text: trimmed.slice(0, MAX_CONTENT_LENGTH),
    warning: 'Le document a ete limite a 20 000 caracteres. Relisez le contenu avant de sauvegarder.',
  }
}

function getFileType(file: File): DocumentFileType | null {
  const lowerName = file.name.toLowerCase()
  if (lowerName.endsWith('.txt') || file.type === 'text/plain') return 'txt'
  if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf'
  if (
    lowerName.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx'
  }
  return null
}

export async function extractDocumentTextAction(file: File): Promise<ExtractDocumentState> {
  const fileType = getFileType(file)
  if (!fileType) {
    return {
      text: null,
      error: 'Seuls les fichiers .txt, .pdf et .docx sont acceptes.',
      warning: null,
      fileType: null,
    }
  }

  try {
    if (fileType === 'txt') {
      const { text, warning } = truncateText(await file.text())
      return { text, error: null, warning, fileType }
    }

    if (fileType === 'pdf') {
      if (file.size > MAX_PDF_SIZE) {
        return { text: null, error: 'PDF trop volumineux (8 Mo maximum).', warning: null, fileType }
      }

      const buffer = new Uint8Array(await file.arrayBuffer())
      const pdf = await getDocumentProxy(buffer)
      const { text: extracted } = await extractText(pdf, { mergePages: true })
      const { text, warning } = truncateText(extracted)

      if (!text) {
        return {
          text: null,
          error:
            'Aucun texte selectionnable detecte. Ce PDF semble scanne ou en image. L OCR n est pas encore pris en charge.',
          warning: null,
          fileType,
        }
      }

      return { text, error: null, warning, fileType }
    }

    if (file.size > MAX_DOCX_SIZE) {
      return { text: null, error: 'DOCX trop volumineux (8 Mo maximum).', warning: null, fileType }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await mammoth.extractRawText({ buffer })
    const { text, warning } = truncateText(result.value)

    if (!text) {
      return {
        text: null,
        error: 'Aucun texte exploitable trouve dans ce document Word.',
        warning: null,
        fileType,
      }
    }

    return { text, error: null, warning, fileType }
  } catch {
    return {
      text: null,
      error: 'Impossible de lire ce fichier. Verifiez qu il n est pas corrompu ou protege par mot de passe.',
      warning: null,
      fileType,
    }
  }
}

export async function createDocumentAction(
  _prevState: DocumentActionState,
  formData: FormData
): Promise<DocumentActionState> {
  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Vous devez être connecté pour ajouter un document.' }
  }

  const parsed = documentSchema.safeParse({
    title: formData.get('title'),
    contentText: formData.get('contentText'),
    sourceType: formData.get('sourceType'),
    originalFilename: formData.get('originalFilename') || undefined,
    fileType: formData.get('fileType') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Document invalide.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('source_documents').insert({
      user_id: user.id,
      title: parsed.data.title,
      content_text: parsed.data.contentText,
      source_type: parsed.data.sourceType,
      original_filename: parsed.data.originalFilename ?? null,
      file_type: parsed.data.fileType ?? null,
    })

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/documents')
    return { error: null }
  } catch {
    return { error: 'Une erreur inattendue est survenue lors de l’enregistrement. Veuillez réessayer.' }
  }
}

export interface DocumentContentState {
  content: string | null
  error: string | null
}

export async function getDocumentContentAction(id: string): Promise<DocumentContentState> {
  const user = await getCurrentUser()
  if (!user) {
    return { content: null, error: 'Vous devez être connecté.' }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('source_documents')
      .select('content_text')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      return { content: null, error: error.message }
    }

    return { content: data?.content_text ?? null, error: null }
  } catch {
    return { content: null, error: 'Une erreur inattendue est survenue lors du chargement du contenu.' }
  }
}

export async function deleteDocumentAction(id: string): Promise<DocumentActionState> {
  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Vous devez être connecté pour supprimer un document.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('source_documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/documents')
    return { error: null }
  } catch {
    return { error: 'Une erreur inattendue est survenue lors de la suppression. Veuillez réessayer.' }
  }
}
