import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { GoogleIntegrationStatus } from '../schemas/googleIntegrationSchema'
import type { EncryptedCredential } from '@/features/ai-credentials/server/credentialEncryption'
import { openGoogleToken, sealGoogleToken } from './googleTokenCodec.ts'

// Forme renvoyee aux appelants : les jetons sont dechiffres en memoire uniquement.
interface GoogleIntegrationRow {
  scopes: string[]
  access_token: string
  refresh_token: string
  expires_at: string
}

interface GoogleIntegrationEncryptedRow {
  scopes: string[]
  access_token_encrypted: EncryptedCredential
  refresh_token_encrypted: EncryptedCredential
  expires_at: string
}

export async function getGoogleIntegrationStatus(userId: string): Promise<GoogleIntegrationStatus> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('google_integrations')
    .select('scopes')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[integrations:google] lecture du statut refusée', error)
    throw new Error('GOOGLE_INTEGRATION_STATUS_FAILED')
  }

  return { connected: data !== null, scopes: data?.scopes ?? [] }
}

export async function getGoogleIntegrationCredentials(
  userId: string
): Promise<GoogleIntegrationRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('google_integrations')
    .select('scopes, access_token_encrypted, refresh_token_encrypted, expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[integrations:google] lecture des identifiants refusée', error)
    throw new Error('GOOGLE_INTEGRATION_CREDENTIALS_FAILED')
  }
  if (!data) return null

  const row = data as GoogleIntegrationEncryptedRow
  return {
    scopes: row.scopes,
    access_token: openGoogleToken(row.access_token_encrypted),
    refresh_token: openGoogleToken(row.refresh_token_encrypted),
    expires_at: row.expires_at,
  }
}

// Fusionne les scopes : connecter Drive apres Gmail (ou l'inverse) etend la
// meme ligne plutot que d'en creer une seconde ou d'ecraser le scope deja
// accorde.
export async function upsertGoogleIntegration(input: {
  userId: string
  newScopes: string[]
  accessToken: string
  refreshToken: string
  expiresAt: string
}): Promise<void> {
  const supabase = await createClient()
  const { data: existing, error: readError } = await supabase
    .from('google_integrations')
    .select('scopes')
    .eq('user_id', input.userId)
    .maybeSingle()

  if (readError) {
    console.error('[integrations:google] lecture des scopes existants refusée', readError)
    throw new Error('GOOGLE_INTEGRATION_SAVE_FAILED')
  }

  const mergedScopes = Array.from(new Set([...(existing?.scopes ?? []), ...input.newScopes]))

  const { error } = await supabase
    .from('google_integrations')
    .upsert(
      {
        user_id: input.userId,
        scopes: mergedScopes,
        access_token_encrypted: sealGoogleToken(input.accessToken),
        refresh_token_encrypted: sealGoogleToken(input.refreshToken),
        expires_at: input.expiresAt,
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[integrations:google] enregistrement de la connexion refusé', error)
    throw new Error('GOOGLE_INTEGRATION_SAVE_FAILED')
  }
}

export async function updateGoogleAccessToken(
  userId: string,
  accessToken: string,
  expiresAt: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('google_integrations')
    .update({ access_token_encrypted: sealGoogleToken(accessToken), expires_at: expiresAt })
    .eq('user_id', userId)

  if (error) {
    console.error('[integrations:google] mise à jour du jeton refusée', error)
    throw new Error('GOOGLE_INTEGRATION_TOKEN_UPDATE_FAILED')
  }
}

// Supprime la connexion (toutes les fonctionnalités Google de l'enseignant).
export async function deleteGoogleIntegration(userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('google_integrations').delete().eq('user_id', userId)

  if (error) {
    console.error('[integrations:google] suppression de la connexion refusée', error)
    throw new Error('GOOGLE_INTEGRATION_DELETE_FAILED')
  }
}
