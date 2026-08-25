import GeneratedDocumentsHistory from '@/features/generated-documents/components/GeneratedDocumentsHistory'
import { listMyGeneratedDocuments } from '@/features/generated-documents/server/generatedDocuments'
import { listMyClasses } from '@/features/classroom/server/classroom.actions'

export const dynamic = 'force-dynamic'

export default async function GeneratedDocumentsHistoryPage() {
  let documents: Awaited<ReturnType<typeof listMyGeneratedDocuments>> = []
  let classes: Awaited<ReturnType<typeof listMyClasses>> = []
  let loadFailed = false
  try {
    const [loadedDocuments, loadedClasses] = await Promise.all([
      listMyGeneratedDocuments(),
      listMyClasses(),
    ])
    documents = loadedDocuments
    classes = loadedClasses
  } catch {
    loadFailed = true
  }
  return <GeneratedDocumentsHistory documents={documents} classes={classes} loadFailed={loadFailed} />
}
