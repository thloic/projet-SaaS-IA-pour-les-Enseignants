'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import BrandLogo from '@/components/shared/BrandLogo'
import { useToast } from '@/components/shared/ToastProvider'
import { saveOnboardingProfileAction } from '@/features/profile/server/profile.actions'
import { createClient } from '@/lib/supabase/client'
import { defaultGrading, type ContentLanguage, type GradingSystem } from '@/features/profile/types/profile.types'
import { appTranslations } from '@/features/i18n/appTranslations'
import { QUEBEC_LEVELS, ONTARIO_LEVELS } from '@/lib/constants/gradeLevels'

const BRAND = '#534AB7'

// Repli utilise quand le pays/province n'a pas de table de correspondance dediee
// (le contenu fourni par le client ne couvre que le Quebec et l'Ontario).
const GENERIC_LEVELS_OPTIONS = [
  'Primaire',
  'Secondaire 1er cycle',
  'Secondaire 2e cycle',
  'Collegial',
  'Universitaire',
  'Formation professionnelle',
]

function getLevelsOptions(nextCountryName: string, nextProvince: string) {
  if (nextCountryName !== 'Canada') return GENERIC_LEVELS_OPTIONS
  return nextProvince === 'Ontario' ? ONTARIO_LEVELS : QUEBEC_LEVELS
}

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
  'Canada',
  'France',
  'Senegal',
  "Cote d'Ivoire",
  'Cameroun',
  'Togo',
  'Autre',
]
const CANADA_PROVINCES = ['Quebec', 'Ontario']
const GRADING_OPTIONS = [
  ['percentage', 'Pourcentage (100 %)'],
  ['letter_ca', 'Lettres (A → R)'],
  ['levels', 'Niveaux 1 – 4'],
  ['20', 'Sur 20'],
  ['10', 'Sur 10'],
] as const

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
  const [countryName, setCountryName] = useState('Canada')
  const [province, setProvince] = useState('Quebec')
  const [subjects, setSubjects] = useState<string[]>(['Mathematiques'])
  const [customSubjectEnabled, setCustomSubjectEnabled] = useState(false)
  const [customSubject, setCustomSubject] = useState('')
  const [levels, setLevels] = useState<string[]>([])
  const [gradingSystem, setGradingSystem] = useState<GradingSystem>('percentage')
  const [language, setLanguage] = useState<ContentLanguage>('en')
  const [styleNotes, setStyleNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = appTranslations[language]
  // Ref synchrone pour bloquer les doubles appels avant que React re-render le bouton disabled
  const isSavingRef = useRef(false)

  function toggleLevel(level: string) {
    setLevels((current) =>
      current.includes(level)
        ? current.filter((item) => item !== level)
        : [...current, level]
    )
  }

  function toggleSubject(subject: string) {
    if (subject === 'Autre') {
      setCustomSubjectEnabled((current) => !current)
      return
    }

    setSubjects((current) =>
      current.includes(subject)
        ? current.filter((item) => item !== subject)
        : [...current, subject]
    )
  }

  function getCountryValue(nextCountryName = countryName, nextProvince = province) {
    return nextCountryName === 'Canada' ? `Canada - ${nextProvince}` : nextCountryName
  }

  function getNormalizedSubjects() {
    const custom = customSubject.trim()
    return customSubjectEnabled && custom ? [...subjects, custom] : subjects
  }

  function handleCountryChange(nextCountryName: string) {
    setCountryName(nextCountryName)
    const nextCountry = getCountryValue(nextCountryName, province)
    setGradingSystem(defaultGrading(nextCountry))
    // Les options de niveau dependent du pays/province : on reinitialise la
    // selection pour eviter de garder des niveaux qui n'existent plus dans la nouvelle liste.
    setLevels([])
  }

  function handleProvinceChange(nextProvince: string) {
    setProvince(nextProvince)
    setGradingSystem(defaultGrading(getCountryValue(countryName, nextProvince)))
    setLevels([])
  }

  function canNext() {
    if (step === 0) return firstName.trim().length > 0 && lastName.trim().length > 0
    if (step === 1) return getNormalizedSubjects().length > 0 && levels.length > 0
    return true
  }

  function notifyIncompleteStep() {
    if (step === 0) {
      if (!firstName.trim() && !lastName.trim()) {
        showToast(t.onboarding.missingName, 'error')
      } else if (!firstName.trim()) {
        showToast(t.onboarding.missingFirstName, 'error')
      } else {
        showToast(t.onboarding.missingLastName, 'error')
      }
      return
    }

    if (step === 1 && getNormalizedSubjects().length === 0) {
      showToast(t.onboarding.missingSubject, 'error')
      return
    }

    if (step === 1 && levels.length === 0) {
      showToast(t.onboarding.missingLevel, 'error')
    }
  }

  async function handleFinish() {
    if (isSavingRef.current) return
    isSavingRef.current = true
    setIsSaving(true)
    setError(null)

    try {
      const result = await saveOnboardingProfileAction({
        firstName,
        lastName,
        country: getCountryValue(),
        subjects: getNormalizedSubjects(),
        levels,
        gradingSystem,
        language,
        styleNotes,
      })

      console.log('[onboarding:client] save result', {
        hasError: Boolean(result.error),
        redirectTo: result.redirectTo ?? null,
        error: result.error,
      })

      if (result.error) {
        showToast(result.error, 'error')
        if (result.redirectTo) {
          console.log('[onboarding:client] invalid session redirect scheduled', {
            redirectTo: result.redirectTo,
          })
          const supabase = createClient()
          const { error: signOutError } = await supabase.auth.signOut()
          console.log('[onboarding:client] browser signOut finished', {
            error: signOutError
              ? {
                  name: signOutError.name,
                  message: signOutError.message,
                  status: signOutError.status,
                }
              : null,
          })
          setTimeout(() => {
            console.log('[onboarding:client] redirecting after invalid session', {
              redirectTo: result.redirectTo,
            })
            router.push(result.redirectTo!)
            router.refresh()
          }, 2000)
          return
        }
        isSavingRef.current = false
        setIsSaving(false)
        return
      }

      showToast(t.onboarding.saved, 'success')
      router.push('/dashboard')
    } catch (err) {
      const message = t.onboarding.saveError
      console.error("[onboarding] erreur inattendue", err)
      showToast(message, 'error')
      isSavingRef.current = false
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-3 py-4 sm:p-4">
      <div className="w-full max-w-lg min-w-0">
        <div className="flex justify-center mb-8">
          <BrandLogo className="h-12 w-40" priority />
        </div>

        <div className="mb-8 flex items-start justify-center gap-1.5 overflow-x-auto px-1 sm:gap-2">
          {t.onboarding.steps.map((label, index) => (
            <div key={label} className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
              {index < t.onboarding.steps.length - 1 && (
                <div
                  className={`h-px w-8 sm:w-12 mb-4 ${
                    index < step ? 'bg-emerald-500' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-6 rounded-3xl border border-border bg-card/60 p-4 backdrop-blur-sm sm:p-8">
          <h1 className="text-xl font-black">{t.onboarding.steps[step]}</h1>

          {error && (
            <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t.onboarding.firstName}</Label>
                  <Input
                    id="firstName"
                    placeholder="Marie"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="bg-muted/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t.onboarding.lastName}</Label>
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
                <Label>{t.onboarding.country}</Label>
                <select
                  className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none"
                  value={countryName}
                  onChange={(event) => handleCountryChange(event.target.value)}
                >
                  {COUNTRIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              {countryName === 'Canada' && (
                <div className="space-y-2">
                  <Label>{t.onboarding.province}</Label>
                  <select
                    className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none"
                    value={province}
                    onChange={(event) => handleProvinceChange(event.target.value)}
                  >
                    {CANADA_PROVINCES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  {t.onboarding.subjects}{' '}
                  <span className="text-muted-foreground">({t.onboarding.multiple})</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS_OPTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleSubject(item)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                        item === 'Autre' ? customSubjectEnabled : subjects.includes(item)
                          ? 'text-white border-transparent'
                          : 'border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                      style={(item === 'Autre' ? customSubjectEnabled : subjects.includes(item)) ? { backgroundColor: BRAND } : {}}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {customSubjectEnabled && (
                  <Input
                    value={customSubject}
                    onChange={(event) => setCustomSubject(event.target.value)}
                    placeholder={t.onboarding.customSubject}
                    className="bg-muted/40"
                  />
                )}
                {getNormalizedSubjects().length === 0 && (
                  <p className="text-xs text-muted-foreground">{t.onboarding.noSubject}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  {t.onboarding.levels} <span className="text-muted-foreground">({t.onboarding.multiple})</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {getLevelsOptions(countryName, province).map((item) => (
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
                  <p className="text-xs text-muted-foreground">{t.onboarding.noLevel}</p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>{t.onboarding.grading}</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {GRADING_OPTIONS.map(([value, label]) => (
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
                <Label>{t.onboarding.contentLanguage}</Label>
                <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                  {([
                    ['fr', 'Francais'],
                    ['en', 'English'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLanguage(value)}
                      className={`min-h-10 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
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
                <Label htmlFor="styleNotes">{t.onboarding.style}</Label>
                <textarea
                  id="styleNotes"
                  value={styleNotes}
                  onChange={(event) => setStyleNotes(event.target.value)}
                  placeholder={t.onboarding.stylePlaceholder}
                  className="min-h-24 w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
            {step > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((current) => current - 1)}
                className="gap-1"
                disabled={isSaving}
              >
                <ChevronLeft size={14} /> {t.onboarding.back}
              </Button>
            ) : (
              <div />
            )}
            {step < t.onboarding.steps.length - 1 ? (
              <div onClick={!canNext() ? notifyIncompleteStep : undefined}>
                <Button
                  className={`w-full gap-1 text-white min-[420px]:w-auto ${!canNext() ? 'pointer-events-none' : ''}`}
                  style={{ backgroundColor: BRAND }}
                  disabled={!canNext()}
                  onClick={() => setStep((current) => current + 1)}
                >
                  {t.onboarding.next} <ChevronRight size={14} />
                </Button>
              </div>
            ) : (
              <Button
                className="w-full gap-1 text-white min-[420px]:w-auto"
                style={{ backgroundColor: BRAND }}
                onClick={handleFinish}
                disabled={isSaving}
              >
                <Check size={14} /> {isSaving ? t.onboarding.saving : t.onboarding.start}
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {t.onboarding.footer}
        </p>
      </div>
    </div>
  )
}
