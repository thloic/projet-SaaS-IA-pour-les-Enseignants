'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import { documentSchema } from '@/features/documents/schemas/documentSchema'

export interface DocumentActionState {
  error: string | null
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
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Document invalide.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('source_documents').insert({
    user_id: user.id,
    title: parsed.data.title,
    content_text: parsed.data.contentText,
    source_type: parsed.data.sourceType,
    original_filename: parsed.data.originalFilename ?? null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/documents')
  return { error: null }
}

export async function deleteDocumentAction(id: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const supabase = await createClient()
  await supabase.from('source_documents').delete().eq('id', id).eq('user_id', user.id)

  revalidatePath('/documents')
}
