import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

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

  if (isProtectedRoute || isAuthRoute) {
    // Client en lecture seule pour vérifier l'état de la session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Auth désactivé en mode mock — à réactiver quand Supabase Auth est configuré
    // if (!user && isProtectedRoute) {
    //   return NextResponse.redirect(new URL('/login', request.url))
    // }
    // if (user && isAuthRoute) {
    //   return NextResponse.redirect(new URL('/dashboard', request.url))
    // }
  }

  // Rafraîchit silencieusement le token de session et propage les cookies
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
