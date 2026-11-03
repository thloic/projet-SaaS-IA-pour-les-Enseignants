import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import { exchangeGoogleAuthCode } from '@/features/integrations/google/server/googleOAuthClient'
import { upsertGoogleIntegration } from '@/features/integrations/google/server/googleIntegrationRepository'
import { GOOGLE_OAUTH_FEATURE_COOKIE, GOOGLE_OAUTH_STATE_COOKIE } from '../connect/route'

function readCookie(request: Request, name: string): string | undefined {
  return request.headers
    .get('cookie')
    ?.split('; ')
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split('=')[1]
}

function redirectWithStatus(request: Request, status: 'connected' | 'error', feature?: string): NextResponse {
  const url = new URL('/agent', request.url)
  url.searchParams.set('google', status)
  if (feature) url.searchParams.set('feature', feature)
  return NextResponse.redirect(url)
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE)
  response.cookies.delete(GOOGLE_OAUTH_FEATURE_COOKIE)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const cookieState = readCookie(request, GOOGLE_OAUTH_STATE_COOKIE)
  const feature = readCookie(request, GOOGLE_OAUTH_FEATURE_COOKIE)

  console.log('[integrations:google] callback reçu', {
    hasCode: Boolean(code),
    state,
    cookieState,
    statesMatch: state === cookieState,
  })

  if (!code || !state || !cookieState || state !== cookieState) {
    console.error('[integrations:google] callback refusé (state invalide ou code manquant)')
    const response = redirectWithStatus(request, 'error', feature)
    clearOAuthCookies(response)
    return response
  }

  try {
    const tokens = await exchangeGoogleAuthCode(code)
    await upsertGoogleIntegration({
      userId: user.id,
      newScopes: tokens.grantedScopes,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    })
    console.log('[integrations:google] connexion enregistrée avec succès', { userId: user.id, scopes: tokens.grantedScopes })

    const response = redirectWithStatus(request, 'connected', feature)
    clearOAuthCookies(response)
    return response
  } catch (error) {
    console.error('[integrations:google] échange du code refusé', error)
    const response = redirectWithStatus(request, 'error', feature)
    clearOAuthCookies(response)
    return response
  }
}
