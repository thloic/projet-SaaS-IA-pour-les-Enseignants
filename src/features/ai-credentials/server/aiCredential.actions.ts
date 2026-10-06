'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/features/profile/server/profile'
import { saveAICredentialSchema, type AICredentialPublicStatus } from '../schemas/aiCredentialSchema'
import { encryptCredential } from './credentialEncryption'
import { decryptCredential } from './credentialEncryption'
import { validateAnthropicApiKey } from './anthropicKeyValidation'
import {
  deleteAICredential,
  getActiveAICredential,
  getAICredentialPublicStatus,
  setAICredentialActive,
  upsertAICredential,
} from './aiCredentialRepository'

export interface AICredentialActionResult {
  data: AICredentialPublicStatus | null
  error: 'AUTH_REQUIRED' | 'INVALID_INPUT' | 'INVALID_KEY' | 'PROVIDER_UNAVAILABLE' | 'SAVE_FAILED' | null
}

export async function testStoredAICredentialAction(): Promise<AICredentialActionResult> {
  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'AUTH_REQUIRED' }
  try {
    const stored = await getActiveAICredential(user.id)
    if (!stored) return { data: null, error: 'INVALID_KEY' }
    const apiKey = decryptCredential({
      encryptedSecret: stored.encryptedSecret,
      iv: stored.iv,
      authTag: stored.authTag,
      version: stored.version,
    })
    const validation = await validateAnthropicApiKey(apiKey)
    if (!validation.valid) return { data: null, error: validation.reason }
    return { data: await getAICredentialPublicStatus(user.id), error: null }
  } catch {
    return { data: null, error: 'SAVE_FAILED' }
  }
}

export async function saveAICredentialAction(apiKey: string): Promise<AICredentialActionResult> {
  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'AUTH_REQUIRED' }

  const parsed = saveAICredentialSchema.safeParse({ apiKey })
  if (!parsed.success) return { data: null, error: 'INVALID_INPUT' }

  const validation = await validateAnthropicApiKey(parsed.data.apiKey)
  if (!validation.valid) return { data: null, error: validation.reason }

  try {
    const encrypted = encryptCredential(parsed.data.apiKey)
    await upsertAICredential({
      userId: user.id,
      ...encrypted,
      keySuffix: parsed.data.apiKey.slice(-4),
    })
    revalidatePath('/settings')
    revalidatePath('/agent')
    return { data: await getAICredentialPublicStatus(user.id), error: null }
  } catch (error) {
    console.error('[ai-credentials] enregistrement impossible', error instanceof Error ? error.message : 'unknown')
    return { data: null, error: 'SAVE_FAILED' }
  }
}

export async function setAICredentialActiveAction(active: boolean): Promise<AICredentialActionResult> {
  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'AUTH_REQUIRED' }
  try {
    await setAICredentialActive(user.id, active)
    revalidatePath('/settings')
    revalidatePath('/agent')
    return { data: await getAICredentialPublicStatus(user.id), error: null }
  } catch {
    return { data: null, error: 'SAVE_FAILED' }
  }
}

export async function deleteAICredentialAction(): Promise<AICredentialActionResult> {
  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'AUTH_REQUIRED' }
  try {
    await deleteAICredential(user.id)
    revalidatePath('/settings')
    revalidatePath('/agent')
    return { data: await getAICredentialPublicStatus(user.id), error: null }
  } catch {
    return { data: null, error: 'SAVE_FAILED' }
  }
}
