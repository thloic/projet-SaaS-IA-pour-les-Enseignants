'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const BRAND = '#534AB7'

const LEVELS_OPTIONS = ['École primaire', 'Collège', 'Lycée', 'Supérieur / BTS', 'Formation professionnelle']
const SUBJECTS_OPTIONS = ['Mathématiques', 'Français', 'Histoire-Géographie', 'SVT', 'Physique-Chimie', 'Anglais', 'Espagnol', 'Philosophie', 'Arts', 'EPS', 'Technologie', 'Autre']
const COUNTRIES = ['Sénégal', 'Côte d\'Ivoire', 'Cameroun', 'Mali', 'Bénin', 'Togo', 'Burkina Faso', 'Guinée', 'Madagascar', 'Congo', 'France', 'Autre']

const STEPS = ['Votre profil', 'Votre enseignement', 'Préférences']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 0
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [country, setCountry]     = useState('Sénégal')

  // Step 1
  const [subject, setSubject]     = useState('Mathématiques')
  const [levels, setLevels]       = useState<string[]>([])

  // Step 2
  const [gradingSystem, setGradingSystem] = useState<'20' | '10' | 'letter'>('20')
  const [language, setLanguage]           = useState<'fr' | 'en'>('fr')

  function toggleLevel(l: string) {
    setLevels((v) => v.includes(l) ? v.filter((x) => x !== l) : [...v, l])
  }

  function canNext() {
    if (step === 0) return firstName.trim().length > 0 && lastName.trim().length > 0
    if (step === 1) return levels.length > 0
    return true
  }

  function handleFinish() {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="rounded-xl p-2" style={{ backgroundColor: BRAND }}>
            <Brain className="text-white" size={22} />
          </div>
          <span className="font-black text-xl">EducAssist</span>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 justify-center mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < step
                      ? 'bg-emerald-500 text-white'
                      : i === step
                      ? 'text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  style={i === step ? { backgroundColor: BRAND } : {}}
                >
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-[10px] hidden sm:block ${i === step ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-8 sm:w-12 mb-4 ${i < step ? 'bg-emerald-500' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-border bg-card/60 backdrop-blur-sm p-8 space-y-6">
          <h2 className="text-xl font-black">{STEPS[step]}</h2>

          {/* Step 0 — Profile */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input id="firstName" placeholder="Marie" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-muted/40" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" placeholder="Dupont" value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-muted/40" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pays</Label>
                <select
                  className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 1 — Teaching */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Matière principale</Label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSubject(s)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                        subject === s ? 'text-white border-transparent' : 'border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                      style={subject === s ? { backgroundColor: BRAND } : {}}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Niveaux enseignés <span className="text-muted-foreground">(plusieurs choix)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {LEVELS_OPTIONS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => toggleLevel(l)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                        levels.includes(l) ? 'text-white border-transparent' : 'border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                      style={levels.includes(l) ? { backgroundColor: BRAND } : {}}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                {levels.length === 0 && <p className="text-xs text-muted-foreground">Sélectionnez au moins un niveau.</p>}
              </div>
            </div>
          )}

          {/* Step 2 — Preferences */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Système de notation</Label>
                <div className="flex gap-2">
                  {([['20', 'Sur 20'], ['10', 'Sur 10'], ['letter', 'Lettres A–F']] as const).map(([v, l]) => (
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
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            {step > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)} className="gap-1">
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
                onClick={() => setStep((s) => s + 1)}
              >
                Suivant <ChevronRight size={14} />
              </Button>
            ) : (
              <Button
                className="text-white gap-1"
                style={{ backgroundColor: BRAND }}
                onClick={handleFinish}
              >
                <Check size={14} /> Commencer
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Vous pourrez modifier ces informations dans vos paramètres.
        </p>
      </div>
    </div>
  )
}

