// Chiffrement des jetons Google au repos (AES-256-GCM, meme module que les
// clés API IA). Fonctions pures, sans acces reseau ni Supabase, pour pouvoir
// etre testees unitairement.
import {
  decryptCredential,
  encryptCredential,
  type EncryptedCredential,
} from '../../../ai-credentials/server/credentialEncryption.ts'

export function sealGoogleToken(token: string, masterKey?: string): EncryptedCredential {
  return encryptCredential(token, masterKey)
}

export function openGoogleToken(sealed: EncryptedCredential, masterKey?: string): string {
  return decryptCredential(sealed, masterKey)
}
