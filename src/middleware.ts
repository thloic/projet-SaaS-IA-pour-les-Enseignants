import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Routes publiques — passent toujours sans vérification
  if (
    pathname === '/' ||
    pathname.startsWith('/share/') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/onboarding')
  ) {
    return NextResponse.next()
  }

  // Autres routes API — passent sans vérification auth
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const isProtectedRoute = pathname.startsWith('/dashboard')
  const isAuthRoute = pathname === '/login' || pathname === '/register'

  if (isAuthRoute) {
    return NextResponse.next()
  }

  // Supabase n'est pas encore implémenté en production.
  // Toutes les routes passent en attendant la mise en place.
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
