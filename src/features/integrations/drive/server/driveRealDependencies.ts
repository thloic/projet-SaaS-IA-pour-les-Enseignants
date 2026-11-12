import 'server-only'

import type { DriveToolDependencies } from './driveTools.ts'
import { getDriveAccessToken } from './driveAccessToken.ts'
import {
  createGoogleDoc,
  downloadDriveFileBytes,
  exportDriveFileText,
  getDriveFileMetadata,
  listDriveFiles,
  replaceGoogleDocText,
} from './driveFileClient.ts'

// Dépendances réelles des outils Drive : jeton de l'enseignant + client Google.
export const realDriveToolDependencies: DriveToolDependencies = {
  getAccessToken: getDriveAccessToken,
  listFiles: listDriveFiles,
  getMetadata: getDriveFileMetadata,
  downloadBytes: downloadDriveFileBytes,
  exportText: exportDriveFileText,
  createDoc: createGoogleDoc,
  replaceDocText: replaceGoogleDocText,
}
