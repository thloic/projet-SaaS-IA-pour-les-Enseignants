'use client'

import { useActionState, useState } from 'react'
import { Settings, User, Globe, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/shared/ToastProvider'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import {
  updateProfileAction,
  type UpdateProfileState,
} from '@/features/profile/server/profile.actions'
import { defaultGrading, type GradingSystem, type ContentLanguage } from '@/features/profile/types/profile.types'
import type { AppLocale } from '@/features/i18n/locale'
import { APP_LOCALES } from '@/features/i18n/locale'
import { suggestedTimeZone, TIME_ZONE_OPTIONS } from '@/lib/timezone'
import SubscriptionSection from '@/features/billing/components/SubscriptionSection'
import type { SubscriptionSummary } from '@/features/billing/server/subscriptionCore'
import AmbassadorSection from '@/features/billing/components/AmbassadorSection'
import type { AmbassadorSummary } from '@/features/billing/server/ambassador'
import AICredentialSettings from '@/features/ai-credentials/components/AICredentialSettings'
import type { AICredentialPublicStatus } from '@/features/ai-credentials/schemas/aiCredentialSchema'

const BRAND = '#534AB7'

const COUNTRIES = ['Canada', 'Mexique', 'Sénégal', "Côte d'Ivoire", 'Cameroun', 'Mali', 'Bénin', 'Togo', 'Burkina Faso', 'Guinée', 'Madagascar', 'Congo', 'France', 'Autre']
const CANADA_PROVINCES = ['Quebec', 'Ontario']
const SUBJECTS_OPTIONS = ['Mathématiques', 'Français', 'Histoire-Géographie', 'SVT', 'Physique-Chimie', 'Anglais', 'Espagnol', 'Philosophie', 'Arts', 'EPS', 'Technologie', 'Autre']
const GRADING_OPTIONS = [
  ['percentage', 'Pourcentage (100 %)'],
  ['letter_ca', 'Lettres (A → R)'],
  ['levels', 'Niveaux 1 – 4'],
  ['20', 'Sur 20'],
  ['10', 'Sur 10'],
] as const

interface SettingsFormProps {
  initialFirstName: string
  initialLastName: string
  initialEmail: string
  initialCountry: string
  initialSubjects: string[]
  initialGradingSystem: GradingSystem
  initialLanguage: ContentLanguage
  initialInterfaceLanguage: AppLocale
  initialTimezone: string
  generationsUsed: number
  generationsLimit: number
  subscription: SubscriptionSummary
  ambassador: AmbassadorSummary
  aiCredentialStatus: AICredentialPublicStatus
}

const initialActionState: UpdateProfileState = { error: null, info: null }

function parseCountry(value: string) {
  if (value === 'Canada - Ontario') return { countryName: 'Canada', province: 'Ontario' }
  if (value === 'Canada - Quebec') return { countryName: 'Canada', province: 'Quebec' }
  return { countryName: value || 'Canada', province: 'Quebec' }
}

export default function SettingsForm({
  initialFirstName,
  initialLastName,
  initialEmail,
  initialCountry,
  initialSubjects,
  initialGradingSystem,
  initialLanguage,
  initialInterfaceLanguage,
  initialTimezone,
  generationsUsed,
  generationsLimit,
  subscription,
  ambassador,
  aiCredentialStatus,
}: SettingsFormProps) {
  const { showToast } = useToast()
  const { setLocale, t } = useAppLocale()
  const initialCountryParts = parseCountry(initialCountry)
  const initialKnownSubjects = initialSubjects.filter((subject) => subject !== 'Autre' && SUBJECTS_OPTIONS.includes(subject))
  const initialCustomSubject = initialSubjects.find((subject) => subject !== 'Autre' && !SUBJECTS_OPTIONS.includes(subject)) ?? ''

  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [email, setEmail] = useState(initialEmail)
  const [countryName, setCountryName] = useState(initialCountryParts.countryName)
  const [province, setProvince] = useState(initialCountryParts.province)
  const [subjects, setSubjects] = useState<string[]>(initialKnownSubjects)
  const [customSubjectEnabled, setCustomSubjectEnabled] = useState(Boolean(initialCustomSubject))
  const [customSubject, setCustomSubject] = useState(initialCustomSubject)
  const [gradingSystem, setGradingSystem] = useState<GradingSystem>(initialGradingSystem)
  const [language, setLanguage] = useState<ContentLanguage>(initialLanguage)
  const [interfaceLanguage, setInterfaceLanguage] = useState<AppLocale>(initialInterfaceLanguage)
  const [timezone, setTimezone] = useState(() => {
    if (initialTimezone !== 'UTC') return initialTimezone
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || initialTimezone
    } catch {
      return initialTimezone
    }
  })

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
    setGradingSystem(defaultGrading(getCountryValue(nextCountryName, province)))
    const nextTimezone = suggestedTimeZone(getCountryValue(nextCountryName, province))
    if (nextTimezone !== 'UTC') setTimezone(nextTimezone)
  }

  function handleProvinceChange(nextProvince: string) {
    setProvince(nextProvince)
    setGradingSystem(defaultGrading(getCountryValue(countryName, nextProvince)))
  }

  const normalizedSubjects = getNormalizedSubjects()

  const [, formAction, isPending] = useActionState(
    async (prevState: UpdateProfileState, formData: FormData) => {
      try {
        const result = await updateProfileAction(prevState, formData)
        if (result.error) {
          showToast(result.error, 'error')
        } else {
          showToast(result.info ?? t.settings.saved, 'success')
        }
        return result
      } catch (error) {
        console.error('[settings] action de mise à jour indisponible', error)
        const message = "We could not save your changes. Please try again in a few moments."
        showToast(message, 'error')
        return { error: message, info: null }
      }
    },
    initialActionState
  )

  return (
    <div className="mx-auto w-full max-w-2xl min-w-0 space-y-8">
      {/* Header */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-muted/40">
          <Settings size={22} className="text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-black">{t.settings.title}</h1>
          <p className="text-sm text-muted-foreground">{t.settings.subtitle}</p>
        </div>
      </div>

      <form action={formAction} className="space-y-8">
        <input type="hidden" name="country" value={getCountryValue()} />
        <input type="hidden" name="gradingSystem" value={gradingSystem} />
        <input type="hidden" name="language" value={language} />
        <input type="hidden" name="interfaceLanguage" value={interfaceLanguage} />
        <input type="hidden" name="timezone" value={timezone} />
        {normalizedSubjects.map((subject) => (
          <input key={subject} type="hidden" name="subjects" value={subject} />
        ))}

        {/* Section 1 — Profile */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User size={16} style={{ color: BRAND }} />
            <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: BRAND }}>{t.settings.teacherProfile}</h2>
          </div>
          <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-black text-white"
                style={{ backgroundColor: BRAND }}
              >
                {firstName[0] ?? ''}{lastName[0] ?? ''}
              </div>
              <div>
                <p className="font-semibold">{firstName} {lastName}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t.onboarding.firstName}</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-muted/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t.onboarding.lastName}</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-muted/40"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted/40"
              />
              <p className="text-xs text-muted-foreground">
                {t.settings.emailNotice}
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t.settings.country}</Label>
                <select
                  className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none"
                  value={countryName}
                  onChange={(e) => handleCountryChange(e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {countryName === 'Canada' && (
                <div className="space-y-2">
                  <Label>{t.settings.province}</Label>
                  <select
                    className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none"
                    value={province}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                  >
                    {CANADA_PROVINCES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label>{t.settings.subjects}</Label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS_OPTIONS.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                        subject === 'Autre' ? customSubjectEnabled : subjects.includes(subject)
                          ? 'border-transparent text-white'
                          : 'border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                      style={(subject === 'Autre' ? customSubjectEnabled : subjects.includes(subject)) ? { backgroundColor: BRAND } : {}}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
                {customSubjectEnabled && (
                  <Input
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder={t.settings.customSubject}
                    className="bg-muted/40"
                  />
                )}
                {normalizedSubjects.length === 0 && (
                  <p className="text-xs text-rose-600 dark:text-rose-300">
                    {t.settings.missingSubject}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 — Preferences */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe size={16} style={{ color: BRAND }} />
            <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: BRAND }}>{t.settings.preferences}</h2>
          </div>
          <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-5">
            <div className="space-y-2">
              <Label>{t.settings.grading}</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {GRADING_OPTIONS.map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setGradingSystem(v)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                      gradingSystem === v ? 'text-white border-transparent' : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                    style={gradingSystem === v ? { backgroundColor: BRAND } : {}}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.settings.interfaceLanguage}</Label>
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                {APP_LOCALES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setInterfaceLanguage(value)
                      setLocale(value)
                    }}
                    className={`min-h-10 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                      interfaceLanguage === value ? 'text-white border-transparent' : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                    style={interfaceLanguage === value ? { backgroundColor: BRAND } : {}}
                  >
                    {value === 'fr' ? '🇫🇷 Français' : value === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.settings.contentLanguage}</Label>
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                {([['fr', '🇫🇷 Français'], ['en', '🇬🇧 English'], ['es', '🇪🇸 Español']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setLanguage(v)}
                    className={`min-h-10 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                      language === v ? 'text-white border-transparent' : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                    style={language === v ? { backgroundColor: BRAND } : {}}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuseau horaire</Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none"
              >
                {!TIME_ZONE_OPTIONS.includes(timezone as (typeof TIME_ZONE_OPTIONS)[number]) && (
                  <option value={timezone}>{timezone}</option>
                )}
                {TIME_ZONE_OPTIONS.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Utilisé pour dater correctement les séances et les registres de présence.
              </p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <Button
          type="submit"
          disabled={isPending}
          className="h-auto min-h-11 w-full whitespace-normal text-white font-bold gap-2"
          style={{ backgroundColor: BRAND }}
        >
          {isPending ? (
            t.settings.saving
          ) : (
            <>
              <Save size={16} /> {t.settings.save}
            </>
          )}
        </Button>
      </form>

      <AICredentialSettings initialStatus={aiCredentialStatus} />

      {/* Section 3 — Plan & Billing */}
      <SubscriptionSection
        subscription={subscription}
        generationsUsed={generationsUsed}
        generationsLimit={generationsLimit}
      />

      {/* Section 4 — Programme ambassadeur */}
      <AmbassadorSection ambassador={ambassador} />
    </div>
  )
}
