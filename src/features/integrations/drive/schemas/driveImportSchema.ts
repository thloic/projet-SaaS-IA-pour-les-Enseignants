import { z } from 'zod'

// Formats lisibles par l'agent (lecture) et limites de taille.
export const DRIVE_GOOGLE_DOC_MIME = 'application/vnd.google-apps.document'
export const DRIVE_PDF_MIME = 'application/pdf'
export const DRIVE_DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const DRIVE_TXT_MIME = 'text/plain'
export const DRIVE_MARKDOWN_MIME = 'text/markdown'

export const DRIVE_SUPPORTED_MIME_TYPES: readonly string[] = [
  DRIVE_GOOGLE_DOC_MIME,
  DRIVE_PDF_MIME,
  DRIVE_DOCX_MIME,
  DRIVE_TXT_MIME,
  DRIVE_MARKDOWN_MIME,
]

// Taille maximale du fichier téléchargé, vérifiée avant tout téléchargement.
export const DRIVE_MAX_FILE_BYTES = 10 * 1024 * 1024

// Taille maximale du texte transmis au modèle, par lecture (caractères).
export const DRIVE_MAX_TEXT_CHARS = 40_000

// Taille maximale d'un texte écrit dans Drive par l'agent (caractères).
export const DRIVE_MAX_WRITE_CHARS = 100_000

// Identifiant Google Drive : caractères alphanumériques, tiret et underscore.
export const driveFileIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{10,200}$/u, 'Identifiant de fichier invalide.')

export const driveImportRequestSchema = z.object({ fileId: driveFileIdSchema })

export type DriveImportRequest = z.infer<typeof driveImportRequestSchema>
