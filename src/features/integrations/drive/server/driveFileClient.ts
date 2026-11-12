import 'server-only'

// Client Drive réel (googleapis, scope drive complet). Chaque appel reçoit le
// jeton de l'enseignant connecté et ne voit que ses propres fichiers.

async function authFor(accessToken: string) {
  const { google } = await import('googleapis')
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return { google, auth }
}

export class DriveRemoteNotFoundError extends Error {
  readonly code = 'FILE_NOT_FOUND' as const

  constructor() {
    super('FILE_NOT_FOUND')
    this.name = 'DriveRemoteNotFoundError'
  }
}

function isNotFound(error: unknown): boolean {
  const code = (error as { code?: number | string } | null)?.code
  const status = (error as { status?: number } | null)?.status
  return code === 404 || code === '404' || status === 404
}

export interface DriveFileSummary {
  id: string
  name: string
  mimeType: string
  modifiedTime: string | null
  webViewLink: string | null
}

export async function listDriveFiles(input: {
  accessToken: string
  nameContains?: string
  pageSize: number
}): Promise<DriveFileSummary[]> {
  const { google, auth } = await authFor(input.accessToken)
  const drive = google.drive({ version: 'v3', auth })
  const clauses = ['trashed = false']
  if (input.nameContains) {
    const escaped = input.nameContains.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'")
    clauses.push(`name contains '${escaped}'`)
  }
  const response = await drive.files.list({
    q: clauses.join(' and '),
    pageSize: input.pageSize,
    orderBy: 'modifiedTime desc',
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
  })
  return (response.data.files ?? []).map((file) => ({
    id: file.id ?? '',
    name: file.name ?? 'Sans titre',
    mimeType: file.mimeType ?? '',
    modifiedTime: file.modifiedTime ?? null,
    webViewLink: file.webViewLink ?? null,
  }))
}

export async function getDriveFileMetadata(input: { accessToken: string; fileId: string }) {
  const { google, auth } = await authFor(input.accessToken)
  const drive = google.drive({ version: 'v3', auth })
  try {
    const response = await drive.files.get({
      fileId: input.fileId,
      fields: 'id,name,mimeType,size,webViewLink',
    })
    const size = response.data.size ? Number(response.data.size) : null
    return {
      id: response.data.id ?? input.fileId,
      name: response.data.name ?? 'Sans titre',
      mimeType: response.data.mimeType ?? '',
      size: size !== null && Number.isFinite(size) ? size : null,
      webViewLink: response.data.webViewLink ?? null,
    }
  } catch (error) {
    if (isNotFound(error)) throw new DriveRemoteNotFoundError()
    throw error
  }
}

export async function downloadDriveFileBytes(input: { accessToken: string; fileId: string }): Promise<Uint8Array> {
  const { google, auth } = await authFor(input.accessToken)
  const drive = google.drive({ version: 'v3', auth })
  try {
    const response = await drive.files.get({ fileId: input.fileId, alt: 'media' }, { responseType: 'arraybuffer' })
    return new Uint8Array(response.data as ArrayBuffer)
  } catch (error) {
    if (isNotFound(error)) throw new DriveRemoteNotFoundError()
    throw error
  }
}

export async function exportDriveFileText(input: { accessToken: string; fileId: string }): Promise<string> {
  const { google, auth } = await authFor(input.accessToken)
  const drive = google.drive({ version: 'v3', auth })
  try {
    const response = await drive.files.export(
      { fileId: input.fileId, mimeType: 'text/plain' },
      { responseType: 'text' }
    )
    return String(response.data ?? '')
  } catch (error) {
    if (isNotFound(error)) throw new DriveRemoteNotFoundError()
    throw error
  }
}

// Crée un Google Doc à partir de texte brut (conversion faite par Drive).
export async function createGoogleDoc(input: {
  accessToken: string
  name: string
  text: string
}): Promise<{ id: string; name: string; webViewLink: string | null }> {
  const { google, auth } = await authFor(input.accessToken)
  const drive = google.drive({ version: 'v3', auth })
  const response = await drive.files.create({
    requestBody: { name: input.name, mimeType: 'application/vnd.google-apps.document' },
    media: { mimeType: 'text/plain', body: input.text },
    fields: 'id,name,webViewLink',
  })
  return {
    id: response.data.id ?? '',
    name: response.data.name ?? input.name,
    webViewLink: response.data.webViewLink ?? null,
  }
}

// Remplace tout le contenu d'un Google Doc par le texte fourni (API Docs).
export async function replaceGoogleDocText(input: {
  accessToken: string
  fileId: string
  text: string
}): Promise<void> {
  const { google, auth } = await authFor(input.accessToken)
  const docs = google.docs({ version: 'v1', auth })
  try {
    const current = await docs.documents.get({ documentId: input.fileId })
    const content = current.data.body?.content ?? []
    const endIndex = content.length > 0 ? (content[content.length - 1].endIndex ?? 1) : 1
    const requests: Array<Record<string, unknown>> = []
    if (endIndex > 2) {
      requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } } })
    }
    if (input.text.length > 0) {
      requests.push({ insertText: { location: { index: 1 }, text: input.text } })
    }
    if (requests.length > 0) {
      await docs.documents.batchUpdate({ documentId: input.fileId, requestBody: { requests } })
    }
  } catch (error) {
    if (isNotFound(error)) throw new DriveRemoteNotFoundError()
    throw error
  }
}
