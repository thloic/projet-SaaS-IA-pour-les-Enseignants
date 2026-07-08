'use client'

import { useActionState, useState } from 'react'
import { Settings, User, Globe, CreditCard, Save, Crown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/shared/ToastProvider'
import {
  updateProfileAction,
  type UpdateProfileState,
} from '@/features/profile/server/profile.actions'
import { defaultGrading, type GradingSystem, type ContentLanguage } from '@/features/profile/types/profile.types'

const BRAND = '#534AB7'

const COUNTRIES = ['Canada', 'Sénégal', "Côte d'Ivoire", 'Cameroun', 'Mali', 'Bénin', 'Togo', 'Burkina Faso', 'Guinée', 'Madagascar', 'Congo', 'France', 'Autre']
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
  generationsUsed: number
  generationsLimit: number
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
  generationsUsed,
  generationsLimit,
}: SettingsFormProps) {
  const { showToast } = useToast()
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
          showToast(result.info ?? 'Modifications enregistrées', 'success')
        }
        return result
      } catch (error) {
        console.error('[settings] action de mise à jour indisponible', error)
        const message = "Nous n’avons pas pu enregistrer vos modifications. Réessayez dans quelques instants."
        showToast(message, 'error')
        return { error: message, info: null }
      }
    },
    initialActionState
  )

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-muted/40">
          <Settings size={22} className="text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Paramètres</h1>
          <p className="text-sm text-muted-foreground">Gérez votre profil et vos préférences</p>
        </div>
      </div>

      <form action={formAction} className="space-y-8">
        <input type="hidden" name="country" value={getCountryValue()} />
        <input type="hidden" name="gradingSystem" value={gradingSystem} />
        <input type="hidden" name="language" value={language} />
        {normalizedSubjects.map((subject) => (
          <input key={subject} type="hidden" name="subjects" value={subject} />
        ))}

        {/* Section 1 — Profile */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User size={16} style={{ color: BRAND }} />
            <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: BRAND }}>Profil enseignant</h2>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-muted/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
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
                Changer l’email nécessite une confirmation par lien envoyé à la nouvelle adresse.
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Pays</Label>
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
                  <Label>Province</Label>
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
                <Label>Matières enseignées</Label>
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
                    placeholder="Saisissez votre matière"
                    className="bg-muted/40"
                  />
                )}
                {normalizedSubjects.length === 0 && (
                  <p className="text-xs text-rose-600 dark:text-rose-300">
                    Sélectionnez au moins une matière avant d’enregistrer.
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
            <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: BRAND }}>Préférences</h2>
          </div>
          <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-5">
            <div className="space-y-2">
              <Label>Système de notation</Label>
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
              <Label>Langue des contenus générés</Label>
              <div className="flex gap-2">
                {([['fr', '🇫🇷 Français'], ['en', '🇬🇧 English']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setLanguage(v)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                      language === v ? 'text-white border-transparent' : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                    style={language === v ? { backgroundColor: BRAND } : {}}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-11 text-white font-bold gap-2"
          style={{ backgroundColor: BRAND }}
        >
          {isPending ? (
            'Enregistrement…'
          ) : (
            <>
              <Save size={16} /> Enregistrer les modifications
            </>
          )}
        </Button>
      </form>

      {/* Section 3 — Plan & Billing (hors périmètre, inchangé) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard size={16} style={{ color: BRAND }} />
          <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: BRAND }}>Plan & Facturation</h2>
        </div>
        <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold flex items-center gap-2">
                Plan Free
                <Badge className="bg-muted text-muted-foreground border-border text-[10px]">Actuel</Badge>
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {generationsUsed} / {generationsLimit} générations utilisées ce mois
              </p>
            </div>
          </div>

          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-amber-400 transition-all"
              style={{ width: `${(generationsUsed / generationsLimit) * 100}%` }}
            />
          </div>

          <Separator />

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-amber-400" />
              <p className="font-bold">Passer au plan Pro</p>
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {['Générations illimitées', 'Export PDF & DOCX', 'Quiz & bulletins sans limite', 'Support prioritaire'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check size={12} className="text-emerald-400 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button className="w-full text-white font-bold h-10" style={{ backgroundColor: BRAND }}>
              <Crown size={15} className="mr-2" /> Passer au Pro — 9€/mois
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
