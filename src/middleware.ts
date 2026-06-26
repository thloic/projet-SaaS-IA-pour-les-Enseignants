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

  if (isPublicPath(pathname)) {
    if ((pathname === '/login' || pathname === '/register') && user) {
      return redirectWithSession(request, '/dashboard', supabaseResponse)
    }
    return supabaseResponse
  }

  // Tout le reste est protégé par défaut.
  if (!user) {
    return redirectWithSession(request, '/login', supabaseResponse)
  }

  // L'onboarding ne nécessite que la session, pas un profil existant —
  // c'est justement la page où ce profil est créé.
  if (pathname === '/onboarding') {
    return supabaseResponse
  }

  if (!supabase) {
    return redirectWithSession(request, '/login', supabaseResponse)
  }

  const { data: profile, error } = await supabase
    .from('teacher_profiles')
    .select('id, first_name, last_name')
    .eq('user_id', user.id)
    .maybeSingle()

  // Une ligne peut exister sans être complète (ex. créée avant que first_name/
  // last_name soient renseignés) — on exige les deux pour considérer
  // l'onboarding comme terminé, sinon on y renvoie l'utilisateur.
  const isProfileComplete = Boolean(profile?.first_name?.trim() && profile?.last_name?.trim())

  if (error) {
    console.error('[middleware] échec de la vérification du profil enseignant :', error.message)
  }

  if (!isProfileComplete) {
    return redirectWithSession(request, '/onboarding', supabaseResponse)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
