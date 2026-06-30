import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`)
    }

    console.error('[auth/callback] échec échange session :', error.message)
    const errorCode = encodeURIComponent(error.code ?? 'callback_failed')
    return NextResponse.redirect(`${origin}/login?error=auth&error_code=${errorCode}`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
