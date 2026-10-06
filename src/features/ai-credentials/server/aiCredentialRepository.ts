import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { AICredentialPublicStatus } from '../schemas/aiCredentialSchema'
import { describeSupabaseError, isAICredentialStorageMissing } from './credentialStorageError'

export interface StoredAICredential {
  encryptedSecret: string
  iv: string
  authTag: string
  version: number
  keySuffix: string
}

interface CredentialRow {
  encrypted_secret: string
  encryption_iv: string
  encryption_tag: string
  encryption_version: number
  key_suffix: string
  is_active: boolean
  status: 'valid' | 'invalid' | 'revoked'
  validated_at: string
  last_used_at: string | null
}

async function readCredentialRow(userId: string): Promise<CredentialRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_ai_credentials')
    .select('encrypted_secret, encryption_iv, encryption_tag, encryption_version, key_suffix, is_active, status, validated_at, last_used_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    // Compatibilité de déploiement : tant que la migration 036 n'est pas
    // appliquée, aucune clé personnelle ne peut exister. L'IA incluse reste
    // donc utilisable au lieu de faire planter les pages Paramètres et Agent.
    if (isAICredentialStorageMissing(error)) return null

    console.error(`[ai-credentials] lecture refusée (${describeSupabaseError(error)})`)
    throw new Error('AI_CREDENTIAL_READ_FAILED')
  }
  return data as CredentialRow | null
}

export async function getAICredentialPublicStatus(userId: string): Promise<AICredentialPublicStatus> {
  const row = await readCredentialRow(userId)
  return {
    connected: Boolean(row),
    active: Boolean(row?.is_active && row.status === 'valid'),
    source: row?.is_active && row.status === 'valid' ? 'personal' : 'included',
    provider: 'anthropic',
    keySuffix: row?.key_suffix ?? null,
    status: row?.status ?? null,
    validatedAt: row?.validated_at ?? null,
    lastUsedAt: row?.last_used_at ?? null,
  }
}

export async function getActiveAICredential(userId: string): Promise<StoredAICredential | null> {
  const row = await readCredentialRow(userId)
  if (!row?.is_active || row.status !== 'valid') return null
  return {
    encryptedSecret: row.encrypted_secret,
    iv: row.encryption_iv,
    authTag: row.encryption_tag,
    version: row.encryption_version,
    keySuffix: row.key_suffix,
  }
}

export async function upsertAICredential(input: {
  userId: string
  encryptedSecret: string
  iv: string
  authTag: string
  version: number
  keySuffix: string
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('user_ai_credentials').upsert({
    user_id: input.userId,
    provider: 'anthropic',
    encrypted_secret: input.encryptedSecret,
    encryption_iv: input.iv,
    encryption_tag: input.authTag,
    encryption_version: input.version,
    key_suffix: input.keySuffix,
    is_active: true,
    status: 'valid',
    validated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) throw new Error('AI_CREDENTIAL_SAVE_FAILED')
}

export async function setAICredentialActive(userId: string, active: boolean): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('user_ai_credentials')
    .update({ is_active: active })
    .eq('user_id', userId)
  if (error) throw new Error('AI_CREDENTIAL_UPDATE_FAILED')
}

export async function deleteAICredential(userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('user_ai_credentials').delete().eq('user_id', userId)
  if (error) throw new Error('AI_CREDENTIAL_DELETE_FAILED')
}

export async function touchAICredential(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('user_ai_credentials')
    .update({ last_used_at: new Date().toISOString() })
    .eq('user_id', userId)
}
