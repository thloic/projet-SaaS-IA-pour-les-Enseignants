import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_EXACT_PATHS = ['/', '/login', '/register']

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_EXACT_PATHS.includes(pathname) ||
    pathname.startsWith('/share/') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/api/')
  )
}

// Une redirection créée à la main (NextResponse.redirect) part d'une réponse
// vierge : elle doit recevoir les cookies de session rafraîchis par
// updateSession, sinon le navigateur perd le token au moment même de la redirection.
function redirectWithSession(request: NextRequest, pathname: string, sourceResponse: NextResponse) {
  const response = NextResponse.redirect(new URL(pathname, request.url))
  sourceResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabaseResponse, user, supabase } = await updateSession(request)

  console.log(`[middleware] ${pathname} — user=${user?.id ?? 'none'} (${user?.email ?? '—'})`)

  if (isPublicPath(pathname)) {
    if ((pathname === '/login' || pathname === '/register') && user) {
      console.log(`[middleware] ${pathname} → /dashboard (déjà connecté)`)
      return redirectWithSession(request, '/dashboard', supabaseResponse)
    }
    return supabaseResponse
  }

  // Tout le reste est protégé par défaut.
  if (!user) {
    console.log(`[middleware] ${pathname} → /login (pas de session)`)
    return redirectWithSession(request, '/login', supabaseResponse)
  }

  // L'onboarding ne nécessite que la session, pas un profil existant —
  // c'est justement la page où ce profil est créé.
  if (pathname === '/onboarding') {
    return supabaseResponse
  }

  const { data: profile, error } = await supabase
    .from('teacher_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  console.log(
    `[middleware] ${pathname} — profil pour user ${user.id} :`,
    profile ? `trouvé (id=${profile.id})` : 'aucun',
    error ? `| erreur requête : ${error.message}` : ''
  )

  if (!profile) {
    console.log(`[middleware] ${pathname} → /onboarding (aucun profil)`)
    return redirectWithSession(request, '/onboarding', supabaseResponse)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
