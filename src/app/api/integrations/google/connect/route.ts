import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import { buildGoogleConsentUrl } from '@/features/integrations/google/server/googleOAuthClient'
import { GOOGLE_INTEGRATION_FEATURES, type GoogleIntegrationFeature } from '@/features/integrations/google/schemas/googleIntegrationSchema'

function isGoogleIntegrationFeature(value: string | null): value is GoogleIntegrationFeature {
  return GOOGLE_INTEGRATION_FEATURES.includes(value as GoogleIntegrationFeature)
}

export const GOOGLE_OAUTH_STATE_COOKIE = 'google_oauth_state'

// state est un nonce anti-CSRF (jamais l'identite de l'utilisateur) : le
// callback ne fait jamais confiance a state pour savoir a qui attribuer les
// jetons — il revalide toujours la session courante via getCurrentUser(), et
// se contente de comparer state au cookie pose ici pour rejeter une requete
// forgee (OAuth CSRF classique).
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const feature = new URL(request.url).searchParams.get('feature')
  if (!isGoogleIntegrationFeature(feature)) {
    return NextResponse.json({ error: 'Fonctionnalité Google inconnue.' }, { status: 400 })
  }

  const state = crypto.randomUUID()
  const consentUrl = buildGoogleConsentUrl(feature, state)
  const response = NextResponse.redirect(consentUrl)
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 300,
    path: '/api/integrations/google',
  })
  return response
}
