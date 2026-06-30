'use client'

import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Brain, FileText, Sparkles, Target, BarChart2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { magicLinkSchema } from '@/features/auth/schemas/authSchema'
import { getAuthCallbackErrorMessage, getAuthErrorMessage } from '@/features/auth/utils/authError'

const BRAND = '#534AB7'

const bubbles = [
  { Icon: FileText, label: 'Cours complets', top: '18%', left: '6%' },
  { Icon: Sparkles, label: 'Quiz IA', top: '38%', left: '52%' },
  { Icon: Target, label: 'Objectifs ciblés', top: '58%', left: '8%' },
  { Icon: BarChart2, label: 'Bulletins', top: '74%', left: '48%' },
]

export default function LoginForm() {
  const containerRef = useRef<HTMLDivElement>(null)

  const [email, setEmail] = useState('')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [error, setError] = useState<string | null>(() =>
    typeof window !== 'undefined'
      ? getAuthCallbackErrorMessage(window.location.search, window.location.hash)
      : null
  )

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

    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (oauthError) {
      setIsGoogleLoading(false)
      setError(getAuthErrorMessage(oauthError))
    }
    // En cas de succès, le navigateur est redirigé vers Google — pas besoin de remettre isGoogleLoading à false.
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const parsed = magicLinkSchema.safeParse({ email: email.trim() })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setIsMagicLinkLoading(true)

    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setIsMagicLinkLoading(false)

    if (otpError) {
      setError(getAuthErrorMessage(otpError))
      return
    }

    setMagicLinkSent(true)
  }

  return (
    <div ref={containerRef} className="flex h-screen w-full overflow-hidden">
      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col p-12 overflow-hidden"
        style={{ backgroundColor: BRAND }}
      >
        {/* Logo */}
        <div className="auth-animate flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2">
            <Brain className="text-white" size={28} />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight">
            EducAssist
          </span>
        </div>

        {/* Bubbles */}
        <div className="auth-animate flex-1 relative">
          {bubbles.map(({ Icon, label, top, left }) => (
            <div
              key={label}
              className="bubble absolute flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2.5 text-white text-sm font-medium shadow-lg"
              style={{ top, left }}
            >
              <Icon size={15} />
              {label}
            </div>
          ))}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        </div>

        {/* Tagline */}
        <div className="auth-animate text-center pb-4">
          <p className="text-white font-semibold text-lg">
            Créez des cours d&apos;exception
          </p>
          <p className="text-white/60 text-sm mt-1">
            Zéro prompt. 100 % pédagogique.
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-white">
        <div className="auth-animate w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <Brain size={22} style={{ color: BRAND }} />
            <span className="font-bold text-xl" style={{ color: BRAND }}>
              EducAssist
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
            <p className="text-sm text-gray-500">Bon retour parmi nous 👋</p>
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
            {isGoogleLoading ? 'Redirection…' : 'Continuer avec Google'}
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-gray-400 shrink-0">ou</span>
            <Separator className="flex-1" />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {magicLinkSent ? (
            <div className="flex items-start gap-3 rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>
                Lien envoyé à <strong>{email}</strong>. Vérifiez votre boîte mail pour vous connecter.
              </span>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.fr"
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
                {isMagicLinkLoading ? 'Envoi…' : 'Recevoir le lien de connexion'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
