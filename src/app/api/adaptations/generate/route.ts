import { NextResponse } from 'next/server'
import {
  AdaptationRequestError,
  createAdaptationGeneration,
} from '@/features/adaptation/server/adaptationGeneration'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'La demande est invalide.' }, { status: 400 })
  }

  try {
    const result = await createAdaptationGeneration(body, request.signal)
    if (result.kind === 'reused') {
      return NextResponse.json({
        adaptationId: result.adaptationId,
        reused: true,
      })
    }

    return new Response(result.stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Adaptation-Id': result.adaptationId,
      },
    })
  } catch (error) {
    if (error instanceof AdaptationRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('[adaptation:api] échec inattendu', error)
    return NextResponse.json(
      { error: 'La génération des adaptations a échoué. Réessayez dans un instant.' },
      { status: 500 }
    )
  }
}
