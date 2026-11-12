// Extraction du texte d'un fichier Drive. Fonctions pures (aucun appel réseau,
// aucun accès Supabase) pour pouvoir être testées unitairement.
import mammoth from 'mammoth'
import { extractText, getDocumentProxy } from 'unpdf'
import {
  DRIVE_DOCX_MIME,
  DRIVE_MARKDOWN_MIME,
  DRIVE_MAX_TEXT_CHARS,
  DRIVE_PDF_MIME,
  DRIVE_TXT_MIME,
} from '../schemas/driveImportSchema.ts'

export type DriveTextErrorCode = 'FILE_UNSUPPORTED' | 'FILE_EMPTY'

export class DriveTextError extends Error {
  readonly code: DriveTextErrorCode

  constructor(code: DriveTextErrorCode) {
    super(code)
    this.name = 'DriveTextError'
    this.code = code
  }
}

export interface TruncatedText {
  text: string
  truncated: boolean
}

// Normalise les fins de ligne et les espaces superflus, puis tronque à la
// limite de caractères. Une coupure n'est jamais silencieuse : `truncated`
// indique à l'appelant (et au modèle, via la carte) que le texte est partiel.
export function truncateDriveText(raw: string, maxChars = DRIVE_MAX_TEXT_CHARS): TruncatedText {
  const normalized = raw.replace(/\r\n?/gu, '\n').replace(/[ \t]+\n/gu, '\n').replace(/\n{3,}/gu, '\n\n').trim()
  if (normalized.length <= maxChars) {
    return { text: normalized, truncated: false }
  }
  return { text: normalized.slice(0, maxChars).trimEnd(), truncated: true }
}

// Extrait le texte d'un contenu binaire selon son type MIME. Les Google Docs
// ne passent pas ici : ils sont exportés en texte par le client Drive.
export async function extractDriveText(input: {
  mimeType: string
  bytes: Uint8Array
}): Promise<TruncatedText> {
  let raw: string

  if (input.mimeType === DRIVE_TXT_MIME || input.mimeType === DRIVE_MARKDOWN_MIME) {
    raw = new TextDecoder('utf-8').decode(input.bytes)
  } else if (input.mimeType === DRIVE_DOCX_MIME) {
    const buffer = Buffer.from(input.bytes)
    const result = await mammoth.extractRawText({ buffer })
    raw = result.value
  } else if (input.mimeType === DRIVE_PDF_MIME) {
    const pdf = await getDocumentProxy(input.bytes)
    const { text } = await extractText(pdf, { mergePages: true })
    raw = text
  } else {
    throw new DriveTextError('FILE_UNSUPPORTED')
  }

  return ensureNonEmpty(truncateDriveText(raw))
}

// Texte déjà exporté (Google Docs en text/plain) : même normalisation.
export function textFromExport(raw: string): TruncatedText {
  return ensureNonEmpty(truncateDriveText(raw))
}

function ensureNonEmpty(result: TruncatedText): TruncatedText {
  if (!result.text) throw new DriveTextError('FILE_EMPTY')
  return result
}
