'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { profileSchema } from '@/features/profile/schemas/profileSchema'
import { useToast } from '@/components/shared/ToastProvider'
import type { ContentLanguage, GradingSystem } from '@/features/profile/types/profile.types'

const BRAND = '#534AB7'

const LEVELS_OPTIONS = [
  'Primaire',
  'Secondaire 1er cycle',
  'Secondaire 2e cycle',
  'Collegial',
  'Universitaire',
  'Formation professionnelle',
]

const SUBJECTS_OPTIONS = [
  'Mathematiques',
  'Francais',
  'Histoire-Geographie',
  'Sciences',
  'Physique-Chimie',
  'Anglais',
  'Espagnol',
  'Philosophie',
  'Arts',
  'Education physique',
  'Technologie',
  'Autre',
]

const COUNTRIES = [
  'Canada - Quebec',
  'Canada - Ontario',
  'France',
  'Senegal',
  "Cote d'Ivoire",
  'Cameroun',
  'Togo',
  'Autre',
]

const STEPS = ['Votre profil', 'Votre enseignement', 'Preferences']

interface OnboardingFormProps {
  initialFirstName?: string
  initialLastName?: string
}

export default function OnboardingForm({
  initialFirstName = '',
  initialLastName = '',
}: OnboardingFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [country, setCountry] = useState('Canada - Quebec')
  const [subject, setSubject] = useState('Mathematiques')
  const [levels, setLevels] = useState<string[]>([])
  const [gradingSystem, setGradingSystem] = useState<GradingSystem>('20')
  const [language, setLanguage] = useState<ContentLanguage>('fr')
  const [styleNotes, setStyleNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleLevel(level: string) {
    setLevels((current) =>
      current.includes(level)
        ? current.filter((item) => item !== level)
        : [...current, level]
    )
  }

  function canNext() {
    if (step === 0) return firstName.trim().length > 0 && lastName.trim().length > 0
    if (step === 1) return levels.length > 0
    return true
  }

  async function handleFinish() {
    setError(null)

    const parsed = profileSchema.safeParse({
      firstName,
      lastName,
      country,
      subject,
      levels,
      gradingSystem,
      language,
      styleNotes,
    })

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Profil incomplet.'
      setError(message)
      showToast(message, 'error')
      return
    }

    setIsSaving(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Connectez-vous avant de completer votre profil enseignant.')
      }

      const { error: profileError } = await supabase.from('teacher_profiles').upsert(
        {
          user_id: user.id,
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
          country: parsed.data.country,
          subject: parsed.data.subject,
          levels: parsed.data.levels,
          grading_system: parsed.data.gradingSystem,
          language: parsed.data.language,
          style_notes: parsed.data.styleNotes || null,
        },
        { onConflict: 'user_id' }
      )

      if (profileError) {
        throw new Error(profileError.message)
      }

      showToast('Profil enregistré avec succès. Bienvenue sur EducAssist !', 'success')
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="rounded-xl p-2" style={{ backgroundColor: BRAND }}>
            <Brain className="text-white" size={22} />
          </div>
          <span className="font-black text-xl">EducAssist</span>
        </div>

        <div className="flex items-center gap-2 justify-center mb-8">
          {STEPS.map((label, index) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    index < step
                      ? 'bg-emerald-500 text-white'
                      : index === step
                      ? 'text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  style={index === step ? { backgroundColor: BRAND } : {}}
                >
                  {index < step ? <Check size={12} /> : index + 1}
                </div>
                <span
                  className={`text-[10px] hidden sm:block ${
                    index === step ? 'text-foreground font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-px w-8 sm:w-12 mb-4 ${
                    index < step ? 'bg-emerald-500' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-border bg-card/60 backdrop-blur-sm p-8 space-y-6">
          <h1 className="text-xl font-black">{STEPS[step]}</h1>

          {error && (
            <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prenom</Label>
                  <Input
                    id="firstName"
                    placeholder="Marie"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="bg-muted/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    placeholder="Dupont"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="bg-muted/40"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pays / province de reference</Label>
                <select
                  className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                >
                  {COUNTRIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Matiere principale</Label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS_OPTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSubject(item)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                        subject === item
                          ? 'text-white border-transparent'
                          : 'border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                      style={subject === item ? { backgroundColor: BRAND } : {}}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Niveaux enseignes <span className="text-muted-foreground">(plusieurs choix)</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {LEVELS_OPTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleLevel(item)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                        levels.includes(item)
                          ? 'text-white border-transparent'
                          : 'border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                      style={levels.includes(item) ? { backgroundColor: BRAND } : {}}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {levels.length === 0 && (
                  <p className="text-xs text-muted-foreground">Selectionnez au moins un niveau.</p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Systeme de notation</Label>
                <div className="flex gap-2">
                  {([
                    ['20', 'Sur 20'],
                    ['10', 'Sur 10'],
                    ['letter', 'Lettres A-F'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGradingSystem(value)}
                      className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                        gradingSystem === value
                          ? 'text-white border-transparent'
                          : 'border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                      style={gradingSystem === value ? { backgroundColor: BRAND } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Langue des contenus generes</Label>
                <div className="flex gap-2">
                  {([
                    ['fr', 'Francais'],
                    ['en', 'English'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLanguage(value)}
                      className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                        language === value
                          ? 'text-white border-transparent'
                          : 'border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                      style={language === value ? { backgroundColor: BRAND } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="styleNotes">Style pedagogique</Label>
                <textarea
                  id="styleNotes"
                  value={styleNotes}
                  onChange={(event) => setStyleNotes(event.target.value)}
                  placeholder="Ex : consignes tres structurees, ton bienveillant, exemples concrets..."
                  className="min-h-24 w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {step > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((current) => current - 1)}
                className="gap-1"
                disabled={isSaving}
              >
                <ChevronLeft size={14} /> Retour
              </Button>
            ) : (
              <div />
            )}
            {step < STEPS.length - 1 ? (
              <Button
                className="text-white gap-1"
                style={{ backgroundColor: BRAND }}
                disabled={!canNext()}
                onClick={() => setStep((current) => current + 1)}
              >
                Suivant <ChevronRight size={14} />
              </Button>
            ) : (
              <Button
                className="text-white gap-1"
                style={{ backgroundColor: BRAND }}
                onClick={handleFinish}
                disabled={isSaving}
              >
                <Check size={14} /> {isSaving ? 'Enregistrement...' : 'Commencer'}
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Vous pourrez modifier ces informations dans vos parametres.
        </p>
      </div>
    </div>
  )
}
