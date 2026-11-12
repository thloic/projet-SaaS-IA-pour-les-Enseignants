import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/features/profile/server/profile'
import { driveChangeSchema } from '@/features/integrations/drive/schemas/driveChangeSchema'
import {
  applyDriveChange,
  DriveToolError,
  type DriveToolErrorCode,
} from '@/features/integrations/drive/server/driveTools'
import { realDriveToolDependencies } from '@/features/integrations/drive/server/driveRealDependencies'

// Application d'une modification Drive CONFIRMÉE par l'enseignant (carte
// « Confirmer » du chat). Aucune écriture sans cette demande explicite. La
// structure est revalidée ici, et l'accès reste celui de l'enseignant connecté.
const applyRequestSchema = z.object({ change: driveChangeSchema }).strict()

const STATUS_BY_CODE: Record<DriveToolErrorCode, number> = {
  DRIVE_NOT_CONNECTED: 409,
  DRIVE_SCOPE_MISSING: 409,
  FILE_NOT_FOUND: 404,
  FILE_UNSUPPORTED: 422,
  FILE_TOO_LARGE: 422,
  FILE_EMPTY: 422,
  CHANGE_UNSUPPORTED: 422,
  DRIVE_FAILED: 500,
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Vous devez être connecté.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'La demande est invalide.' }, { status: 400 })
  }

  const parsed = applyRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'La modification est invalide.' }, { status: 400 })
  }

  try {
    const result = await applyDriveChange(user.id, { change: parsed.data.change }, realDriveToolDependencies)
    return NextResponse.json(result)
  } catch (error) {
    const code: DriveToolErrorCode = error instanceof DriveToolError ? error.code : 'DRIVE_FAILED'
    if (code === 'DRIVE_FAILED') {
      console.error('[agent:drive-apply] échec', error)
    }
    return NextResponse.json({ error: code }, { status: STATUS_BY_CODE[code] })
  }
}
