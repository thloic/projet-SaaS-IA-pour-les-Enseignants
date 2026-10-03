import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import { getGoogleIntegrationStatus } from '@/features/integrations/google/server/googleIntegrationRepository'
import { GMAIL_SEND_SCOPE } from '@/features/integrations/google/schemas/googleIntegrationSchema'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })

  try {
    const status = await getGoogleIntegrationStatus(user.id)
    return NextResponse.json({
      gmailConnected: status.connected && status.scopes.includes(GMAIL_SEND_SCOPE),
      connectUrl: '/api/integrations/google/connect?feature=gmail',
    })
  } catch (error) {
    console.error('[integrations:google] statut indisponible', error)
    return NextResponse.json({ error: 'STATUS_UNAVAILABLE' }, { status: 500 })
  }
}
