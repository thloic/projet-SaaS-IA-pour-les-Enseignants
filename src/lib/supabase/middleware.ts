import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Supabase pas encore implémenté, on ne fait rien pour les sessions.
  return NextResponse.next()
}
