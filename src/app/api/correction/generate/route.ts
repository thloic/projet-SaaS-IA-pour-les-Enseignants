import { NextResponse } from 'next/server'
import {
  CorrectionRequestError,
  createCorrectionBatchGeneration,
} from '@/features/correction/server/correctionOrchestration'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'La demande est invalide.' }, { status: 400 })
  }

  try {
    const stream = await createCorrectionBatchGeneration(body, request.signal)

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    })
  } catch (error) {
    if (error instanceof CorrectionRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('[correction:api] échec inattendu', error)
    return NextResponse.json(
      { error: 'Le lancement de la correction a échoué. Réessayez dans un instant.' },
      { status: 500 }
    )
  }
}
