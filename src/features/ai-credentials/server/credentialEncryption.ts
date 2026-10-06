import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export interface EncryptedCredential {
  encryptedSecret: string
  iv: string
  authTag: string
  version: number
}

function encryptionKey(value = process.env.AI_CREDENTIALS_ENCRYPTION_KEY): Buffer {
  if (!value) throw new Error('MISSING_AI_CREDENTIALS_ENCRYPTION_KEY')

  const normalized = value.trim()
  const key = /^[a-f\d]{64}$/i.test(normalized)
    ? Buffer.from(normalized, 'hex')
    : Buffer.from(normalized, 'base64')

  if (key.length !== 32) throw new Error('INVALID_AI_CREDENTIALS_ENCRYPTION_KEY')
  return key
}

export function encryptCredential(secret: string, masterKey?: string): EncryptedCredential {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(masterKey), iv)
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])

  return {
    encryptedSecret: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    version: 1,
  }
}

export function decryptCredential(
  encrypted: Pick<EncryptedCredential, 'encryptedSecret' | 'iv' | 'authTag' | 'version'>,
  masterKey?: string
): string {
  if (encrypted.version !== 1) throw new Error('UNSUPPORTED_AI_CREDENTIAL_ENCRYPTION_VERSION')

  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(masterKey),
    Buffer.from(encrypted.iv, 'base64')
  )
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.encryptedSecret, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
