import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { GoogleIntegrationStatus } from '../schemas/googleIntegrationSchema'

interface GoogleIntegrationRow {
  scopes: string[]
  access_token: string
  refresh_token: string
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
    .select('scopes, access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[integrations:google] lecture des identifiants refusée', error)
    throw new Error('GOOGLE_INTEGRATION_CREDENTIALS_FAILED')
  }

  return data
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
  const existing = await getGoogleIntegrationCredentials(input.userId)
  const mergedScopes = Array.from(new Set([...(existing?.scopes ?? []), ...input.newScopes]))

  const { error } = await supabase
    .from('google_integrations')
    .upsert(
      {
        user_id: input.userId,
        scopes: mergedScopes,
        access_token: input.accessToken,
        refresh_token: input.refreshToken,
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
    .update({ access_token: accessToken, expires_at: expiresAt })
    .eq('user_id', userId)

  if (error) {
    console.error('[integrations:google] mise à jour du jeton refusée', error)
    throw new Error('GOOGLE_INTEGRATION_TOKEN_UPDATE_FAILED')
  }
}
