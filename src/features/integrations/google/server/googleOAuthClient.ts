import 'server-only'

import { google } from 'googleapis'
import type { GoogleIntegrationFeature } from '../schemas/googleIntegrationSchema'
import { scopeForFeature } from '../schemas/googleIntegrationSchema'

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`MISSING_${name}`)
  return value
}

function redirectUri(): string {
  const appUrl = requiredEnv('NEXT_PUBLIC_APP_URL').replace(/\/$/, '')
  return `${appUrl}/api/integrations/google/callback`
}

export function createGoogleOAuthClient() {
  return new google.auth.OAuth2(
    requiredEnv('GOOGLE_OAUTH_CLIENT_ID'),
    requiredEnv('GOOGLE_OAUTH_CLIENT_SECRET'),
    redirectUri()
  )
}

// access_type: offline + prompt: consent garantissent un refresh_token meme
// si l'enseignant avait deja autorise l'app auparavant. include_granted_scopes
// permet l'autorisation incrementale : connecter Drive plus tard ne retire
// jamais le scope Gmail deja accorde, et inversement.
export function buildGoogleConsentUrl(feature: GoogleIntegrationFeature, state: string): string {
  const client = createGoogleOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: [scopeForFeature(feature)],
    state,
  })
}

export interface ExchangedGoogleTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string
  grantedScopes: string[]
}

export async function exchangeGoogleAuthCode(code: string): Promise<ExchangedGoogleTokens> {
  const client = createGoogleOAuthClient()
  console.log('[google:oauth] échange du code en cours…')
  const { tokens } = await client.getToken(code)
  console.log('[google:oauth] jetons reçus', {
    hasAccessToken: Boolean(tokens.access_token),
    hasRefreshToken: Boolean(tokens.refresh_token),
    expiryDate: tokens.expiry_date,
    scope: tokens.scope,
  })

  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    console.error('[google:oauth] réponse de jeton incomplète — refresh_token absent ? Vérifie prompt=consent et access_type=offline', tokens)
    throw new Error('INCOMPLETE_GOOGLE_TOKEN_RESPONSE')
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(tokens.expiry_date).toISOString(),
    grantedScopes: (tokens.scope ?? '').split(' ').filter(Boolean),
  }
}

export interface RefreshedGoogleAccessToken {
  accessToken: string
  expiresAt: string
}

// Rafraichit un access_token expire a partir du refresh_token stocke ; le
// refresh_token lui-meme ne change pas (Google n'en emet un nouveau que lors
// d'un nouveau consentement complet).
export async function refreshGoogleAccessToken(refreshToken: string): Promise<RefreshedGoogleAccessToken> {
  console.log('[google:oauth] rafraîchissement du jeton d’accès…')
  const client = createGoogleOAuthClient()
  client.setCredentials({ refresh_token: refreshToken })

  try {
    const { credentials } = await client.refreshAccessToken()
    console.log('[google:oauth] jeton rafraîchi', { hasAccessToken: Boolean(credentials.access_token), expiryDate: credentials.expiry_date })

    if (!credentials.access_token || !credentials.expiry_date) {
      throw new Error('INCOMPLETE_GOOGLE_REFRESH_RESPONSE')
    }

    return {
      accessToken: credentials.access_token,
      expiresAt: new Date(credentials.expiry_date).toISOString(),
    }
  } catch (error) {
    console.error('[google:oauth] échec du rafraîchissement — le refresh_token a peut-être été révoqué côté Google', error)
    throw error
  }
}
