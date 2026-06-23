import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import type { SourceDocument } from '@/features/documents/types/document.types'

export async function listMyDocuments(): Promise<SourceDocument[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('source_documents')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    // Capté par error.tsx au niveau de la route.
    throw new Error(`Impossible de charger vos documents : ${error.message}`)
  }

  return data ?? []
}
