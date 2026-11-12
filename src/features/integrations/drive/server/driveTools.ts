// Logique métier des outils Drive de l'agent. Toutes les dépendances réseau
// sont injectées : les tests n'appellent jamais Google.
import { GoogleAccessTokenError } from '../../google/server/googleAccessToken.ts'
import {
  DRIVE_GOOGLE_DOC_MIME,
  DRIVE_MAX_FILE_BYTES,
  DRIVE_SUPPORTED_MIME_TYPES,
  driveFileIdSchema,
} from '../schemas/driveImportSchema.ts'
import { driveChangeSchema, type DriveChange } from '../schemas/driveChangeSchema.ts'
import { DriveTextError, extractDriveText, textFromExport } from './driveFileText.ts'
import { buildDriveReferenceBlock } from '../../../agent/server/driveReferenceBlock.ts'

export type DriveToolErrorCode =
  | 'DRIVE_NOT_CONNECTED'
  | 'DRIVE_SCOPE_MISSING'
  | 'FILE_NOT_FOUND'
  | 'FILE_UNSUPPORTED'
  | 'FILE_TOO_LARGE'
  | 'FILE_EMPTY'
  | 'CHANGE_UNSUPPORTED'
  | 'DRIVE_FAILED'

export class DriveToolError extends Error {
  readonly code: DriveToolErrorCode

  constructor(code: DriveToolErrorCode) {
    super(code)
    this.name = 'DriveToolError'
    this.code = code
  }
}

export interface DriveFileMeta {
  id: string
  name: string
  mimeType: string
  size: number | null
  webViewLink: string | null
}

export interface DriveFileSummaryItem {
  id: string
  name: string
  mimeType: string
  modifiedTime: string | null
  webViewLink: string | null
}

export interface DriveToolDependencies {
  getAccessToken(userId: string): Promise<string>
  listFiles(input: { accessToken: string; nameContains?: string; pageSize: number }): Promise<DriveFileSummaryItem[]>
  getMetadata(input: { accessToken: string; fileId: string }): Promise<DriveFileMeta>
  downloadBytes(input: { accessToken: string; fileId: string }): Promise<Uint8Array>
  exportText(input: { accessToken: string; fileId: string }): Promise<string>
  createDoc(input: { accessToken: string; name: string; text: string }): Promise<{ id: string; name: string; webViewLink: string | null }>
  replaceDocText(input: { accessToken: string; fileId: string; text: string }): Promise<void>
}

// Validation d'entrée : une donnée invalide devient un code métier, jamais une
// erreur brute de schéma.
function parseOrThrow<T>(parse: () => T, code: DriveToolErrorCode): T {
  try {
    return parse()
  } catch {
    throw new DriveToolError(code)
  }
}

// Traduit une erreur quelconque en code métier. Le message brut de Google
// n'est jamais renvoyé au modèle ni à l'enseignant.
function mapError(error: unknown): DriveToolError {
  if (error instanceof DriveToolError) return error
  if (error instanceof DriveTextError) return new DriveToolError(error.code)
  if (error instanceof GoogleAccessTokenError) {
    return new DriveToolError(error.code === 'GOOGLE_NOT_CONNECTED' ? 'DRIVE_NOT_CONNECTED' : 'DRIVE_SCOPE_MISSING')
  }
  if (typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'FILE_NOT_FOUND') {
    return new DriveToolError('FILE_NOT_FOUND')
  }
  console.error('[drive:tools] échec inattendu', error)
  return new DriveToolError('DRIVE_FAILED')
}

async function run<T>(userId: string, deps: DriveToolDependencies, action: (accessToken: string) => Promise<T>): Promise<T> {
  try {
    const accessToken = await deps.getAccessToken(userId)
    return await action(accessToken)
  } catch (error) {
    throw mapError(error)
  }
}

export async function searchDriveFiles(
  userId: string,
  input: { query?: string; limit?: number },
  deps: DriveToolDependencies
): Promise<{ files: DriveFileSummaryItem[] }> {
  return run(userId, deps, async (accessToken) => {
    const files = await deps.listFiles({
      accessToken,
      nameContains: input.query?.trim() || undefined,
      pageSize: input.limit ?? 10,
    })
    return { files }
  })
}

export async function readDriveFile(
  userId: string,
  input: { fileId: string },
  deps: DriveToolDependencies
): Promise<{ name: string; mimeType: string; webViewLink: string | null; truncated: boolean; reference: string }> {
  const fileId = parseOrThrow(() => driveFileIdSchema.parse(input.fileId), 'FILE_NOT_FOUND')
  return run(userId, deps, async (accessToken) => {
    const meta = await deps.getMetadata({ accessToken, fileId })
    if (!DRIVE_SUPPORTED_MIME_TYPES.includes(meta.mimeType)) throw new DriveToolError('FILE_UNSUPPORTED')
    if (meta.size !== null && meta.size > DRIVE_MAX_FILE_BYTES) throw new DriveToolError('FILE_TOO_LARGE')

    const extracted =
      meta.mimeType === DRIVE_GOOGLE_DOC_MIME
        ? textFromExport(await deps.exportText({ accessToken, fileId }))
        : await extractDriveText({
            mimeType: meta.mimeType,
            bytes: await deps.downloadBytes({ accessToken, fileId }),
          })

    return {
      name: meta.name,
      mimeType: meta.mimeType,
      webViewLink: meta.webViewLink,
      truncated: extracted.truncated,
      reference: buildDriveReferenceBlock({ name: meta.name, text: extracted.text, truncated: extracted.truncated }),
    }
  })
}

// Remplacer le texte d'un document n'est sûr que si tout le document a été vu.
// Un document plus long que la limite de lecture serait écrasé en partie : refus.
async function assertWholeDocument(deps: DriveToolDependencies, accessToken: string, fileId: string): Promise<void> {
  const raw = await deps.exportText({ accessToken, fileId })
  if (textFromExport(raw).truncated) throw new DriveToolError('CHANGE_UNSUPPORTED')
}

// Vérifie la modification et récupère le nom du fichier visé, sans rien écrire.
// C'est l'étape « proposition » : la carte de confirmation est affichée ensuite.
export async function proposeDriveChange(
  userId: string,
  input: { change: DriveChange },
  deps: DriveToolDependencies
): Promise<{ status: 'proposal'; change: DriveChange; targetName: string; webViewLink: string | null }> {
  const change = parseOrThrow(() => driveChangeSchema.parse(input.change), 'CHANGE_UNSUPPORTED')
  return run(userId, deps, async (accessToken) => {
    if (change.type === 'update_doc') {
      const meta = await deps.getMetadata({ accessToken, fileId: change.fileId })
      if (meta.mimeType !== DRIVE_GOOGLE_DOC_MIME) throw new DriveToolError('CHANGE_UNSUPPORTED')
      await assertWholeDocument(deps, accessToken, change.fileId)
      return { status: 'proposal' as const, change, targetName: meta.name, webViewLink: meta.webViewLink }
    }
    return { status: 'proposal' as const, change, targetName: change.name, webViewLink: null }
  })
}

// Application d'une modification CONFIRMÉE par l'enseignant. Revalide tout.
export async function applyDriveChange(
  userId: string,
  input: { change: DriveChange },
  deps: DriveToolDependencies
): Promise<{ status: 'done'; targetName: string; webViewLink: string | null }> {
  const change = parseOrThrow(() => driveChangeSchema.parse(input.change), 'CHANGE_UNSUPPORTED')
  return run(userId, deps, async (accessToken) => {
    if (change.type === 'update_doc') {
      const meta = await deps.getMetadata({ accessToken, fileId: change.fileId })
      if (meta.mimeType !== DRIVE_GOOGLE_DOC_MIME) throw new DriveToolError('CHANGE_UNSUPPORTED')
      await assertWholeDocument(deps, accessToken, change.fileId)
      await deps.replaceDocText({ accessToken, fileId: change.fileId, text: change.text })
      return { status: 'done' as const, targetName: meta.name, webViewLink: meta.webViewLink }
    }
    const created = await deps.createDoc({ accessToken, name: change.name, text: change.text })
    return { status: 'done' as const, targetName: created.name, webViewLink: created.webViewLink }
  })
}
