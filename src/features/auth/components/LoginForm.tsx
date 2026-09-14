'use client'

import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { FileText, Clock, Target, BarChart2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import BrandLogo from '@/components/shared/BrandLogo'
import { createClient } from '@/lib/supabase/client'
import { magicLinkSchema } from '@/features/auth/schemas/authSchema'
import { getAuthCallbackErrorMessage, getAuthErrorMessage } from '@/features/auth/utils/authError'
import { useToast } from '@/components/shared/ToastProvider'
import ThemeToggle from '@/components/shared/ThemeToggle'
import { usePublicLocale } from '@/features/marketing/hooks/usePublicLocale'

const BRAND = '#534AB7'

const AUTH_COPY = {
  fr: {
    bubbles: ['Cours complets', 'Quiz IA', 'Objectifs ciblés', 'Bulletins'],
    tagline: 'Créez des cours d’exception',
    taglineSub: 'Zéro prompt. 100 % pédagogique.',
    title: 'Connexion',
    welcome: 'Bon retour parmi nous 👋',
    google: 'Continuer avec Google',
    redirecting: 'Redirection…',
    or: 'ou',
    sentToast: 'Le lien de connexion vient de vous être envoyé.',
    sent: 'Lien envoyé à',
    sentHint: 'Vérifiez votre boîte mail pour vous connecter.',
    email: 'Email',
    emailPlaceholder: 'vous@exemple.fr',
    send: 'Recevoir le lien de connexion',
    sending: 'Envoi…',
    invalidEmail: 'Saisissez une adresse email valide.',
    authError: 'La connexion a échoué. Réessayez dans un instant.',
  },
  en: {
    bubbles: ['Complete lessons', 'AI quizzes', 'Focused objectives', 'Reports'],
    tagline: 'Create exceptional lessons',
    taglineSub: 'Zero prompts. 100% teaching.',
    title: 'Log in',
    welcome: 'Welcome back 👋',
    google: 'Continue with Google',
    redirecting: 'Redirecting…',
    or: 'or',
    sentToast: 'Your login link has just been sent.',
    sent: 'Link sent to',
    sentHint: 'Check your inbox to log in.',
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    send: 'Send me a login link',
    sending: 'Sending…',
    invalidEmail: 'Enter a valid email address.',
    authError: 'Login failed. Please try again shortly.',
  },
  es: {
    bubbles: ['Lecciones completas', 'Quizzes con IA', 'Objetivos concretos', 'Informes'],
    tagline: 'Crea lecciones excepcionales',
    taglineSub: 'Sin prompts. 100 % educación.',
    title: 'Iniciar sesión',
    welcome: 'Nos alegra verte de nuevo 👋',
    google: 'Continuar con Google',
    redirecting: 'Redirigiendo…',
    or: 'o',
    sentToast: 'Te hemos enviado el enlace de acceso.',
    sent: 'Enlace enviado a',
    sentHint: 'Revisa tu correo para iniciar sesión.',
    email: 'Correo electrónico',
    emailPlaceholder: 'tu@ejemplo.es',
    send: 'Recibir el enlace de acceso',
    sending: 'Enviando…',
    invalidEmail: 'Introduce un correo electrónico válido.',
    authError: 'No se ha podido iniciar sesión. Inténtalo de nuevo en unos instantes.',
  },
} as const

const bubblePositions = [
  { Icon: FileText, top: '18%', left: '6%' },
  { Icon: Clock, top: '38%', left: '52%' },
  { Icon: Target, top: '58%', left: '8%' },
  { Icon: BarChart2, top: '74%', left: '48%' },
]

export default function LoginForm() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()
  const { locale, setLocale } = usePublicLocale()
  const copy = AUTH_COPY[locale]

  const [email, setEmail] = useState('')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const callbackError = getAuthCallbackErrorMessage(window.location.search, window.location.hash)
    if (callbackError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(locale === 'fr' ? callbackError : copy.authError)
    }
  }, [copy.authError, locale])

  useGSAP(
    () => {
      gsap.fromTo(
        '.auth-animate',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.15, ease: 'power2.out' }
      )
      gsap.to('.bubble', {
        y: -12,
        duration: 2.2,
        yoyo: true,
        repeat: -1,
        ease: 'power1.inOut',
        stagger: 0.4,
      })
    },
    { scope: containerRef }
  )

  async function handleGoogleLogin() {
    setError(null)
    setIsGoogleLoading(true)

    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (oauthError) throw oauthError
    } catch (error) {
      console.error('[auth] échec de la connexion Google', error)
      const message = locale === 'fr' ? getAuthErrorMessage(error instanceof Error ? error : null) : copy.authError
      setIsGoogleLoading(false)
      setError(message)
      showToast(message, 'error')
    }
    // En cas de succès, le navigateur est redirigé vers Google — pas besoin de remettre isGoogleLoading à false.
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const parsed = magicLinkSchema.safeParse({ email: email.trim() })
    if (!parsed.success) {
      const message = locale === 'fr' ? parsed.error.issues[0].message : copy.invalidEmail
      setError(message)
      showToast(message, 'error')
      return
    }

    setIsMagicLinkLoading(true)

    try {
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: parsed.data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (otpError) throw otpError
      setMagicLinkSent(true)
      showToast(copy.sentToast, 'success')
    } catch (error) {
      console.error('[auth] échec de l’envoi du lien magique', error)
      const message = locale === 'fr' ? getAuthErrorMessage(error instanceof Error ? error : null) : copy.authError
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsMagicLinkLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col p-12 overflow-hidden"
        style={{ backgroundColor: BRAND }}
      >
        {/* Logo */}
        <div className="auth-animate flex items-center gap-3">
          <BrandLogo className="h-20 w-20" priority />
        </div>

        {/* Bubbles */}
        <div className="auth-animate flex-1 relative">
          {bubblePositions.map(({ Icon, top, left }, index) => (
            <div
              key={copy.bubbles[index]}
              className="bubble absolute flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2.5 text-white text-sm font-medium shadow-lg"
              style={{ top, left }}
            >
              <Icon size={15} />
              {copy.bubbles[index]}
            </div>
          ))}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        </div>

        {/* Tagline */}
        <div className="auth-animate text-center pb-4">
          <p className="text-white font-semibold text-lg">
            {copy.tagline}
          </p>
          <p className="text-white/60 text-sm mt-1">
            {copy.taglineSub}
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="relative flex w-full items-center justify-center bg-[#F5F3FF] p-8 transition-colors dark:bg-[#080711] lg:w-1/2">
        <div className="absolute right-5 top-5 flex items-center gap-2">
          <div className="flex rounded-lg border border-[#534AB7]/20 p-0.5 text-xs font-bold dark:border-white/15">
            {(['en', 'fr', 'es'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLocale(option)}
                className={`rounded-md px-2 py-1.5 uppercase ${locale === option ? 'bg-[#534AB7] text-white' : 'text-muted-foreground'}`}
                aria-pressed={locale === option}
              >
                {option}
              </button>
            ))}
          </div>
          <ThemeToggle />
        </div>
        <div className="auth-animate w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <BrandLogo className="h-16 w-16" priority />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{copy.title}</h1>
            <p className="text-sm text-muted-foreground">{copy.welcome}</p>
          </div>

          {/* Google */}
          <Button
            variant="outline"
            className="w-full gap-3"
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.083 17.64 11.775 17.64 9.2z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.039l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            {isGoogleLoading ? copy.redirecting : copy.google}
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground shrink-0">{copy.or}</span>
            <Separator className="flex-1" />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          {magicLinkSent ? (
            <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>
                {copy.sent} <strong>{email}</strong>. {copy.sentHint}
              </span>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">{copy.email}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={copy.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <Button
                type="submit"
                className="w-full text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: BRAND }}
                disabled={isMagicLinkLoading}
              >
                {isMagicLinkLoading ? copy.sending : copy.send}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
