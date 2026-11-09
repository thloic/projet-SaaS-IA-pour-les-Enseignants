import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import {
  deleteGoogleIntegration,
  getGoogleIntegrationCredentials,
} from '@/features/integrations/google/server/googleIntegrationRepository'

const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

// Déconnexion : supprime la connexion locale (jetons chiffrés compris), puis
// demande à Google de révoquer le refresh_token. La suppression locale prime :
// elle réussit même si la révocation échoue ou si les jetons ne se déchiffrent
// plus.
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })

  let refreshToken: string | null = null
  try {
    refreshToken = (await getGoogleIntegrationCredentials(user.id))?.refresh_token ?? null
  } catch {
    // Déchiffrement impossible : on supprime quand même la connexion locale.
  }

  if (refreshToken) {
    try {
      const response = await fetch(GOOGLE_REVOKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: refreshToken }),
      })
      if (!response.ok) console.error('[integrations:google] révocation Google refusée', response.status)
    } catch (error) {
      console.error('[integrations:google] révocation Google injoignable', error)
    }
  }

  try {
    await deleteGoogleIntegration(user.id)
    return NextResponse.json({ connected: false })
  } catch (error) {
    console.error('[integrations:google] déconnexion impossible', error)
    return NextResponse.json({ error: 'DISCONNECT_FAILED' }, { status: 500 })
  }
}
