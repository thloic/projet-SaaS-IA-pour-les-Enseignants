import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import { getGoogleIntegrationStatus } from '@/features/integrations/google/server/googleIntegrationRepository'
import {
  GOOGLE_INTEGRATION_FEATURES,
  isFeatureSatisfied,
  type GoogleIntegrationFeature,
} from '@/features/integrations/google/schemas/googleIntegrationSchema'

function isGoogleIntegrationFeature(value: string | null): value is GoogleIntegrationFeature {
  return GOOGLE_INTEGRATION_FEATURES.includes(value as GoogleIntegrationFeature)
}

// Défaut « gmail » : ParentEmailDraftCard.tsx appelle cette route sans paramètre
// et attend gmailConnected/connectUrl pour l'envoi.
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })

  const requestedFeature = new URL(request.url).searchParams.get('feature')
  const feature = isGoogleIntegrationFeature(requestedFeature) ? requestedFeature : 'gmail'

  try {
    const status = await getGoogleIntegrationStatus(user.id)
    const connected = isFeatureSatisfied(status, feature)
    return NextResponse.json({
      gmailConnected: connected,
      connected,
      connectUrl: `/api/integrations/google/connect?feature=${feature}`,
    })
  } catch (error) {
    console.error('[integrations:google] statut indisponible', error)
    return NextResponse.json({ error: 'STATUS_UNAVAILABLE' }, { status: 500 })
  }
}
