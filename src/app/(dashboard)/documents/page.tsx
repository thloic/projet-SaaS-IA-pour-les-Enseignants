import { listMyDocuments } from '@/features/documents/server/document'
import DocumentsManager from '@/features/documents/components/DocumentsManager'

export default async function DocumentsPage() {
  const documents = await listMyDocuments()
  return <DocumentsManager initialDocuments={documents} />
}
