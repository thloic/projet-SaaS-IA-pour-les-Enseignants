'use client'

import { useState } from 'react'
import { Settings, User, Globe, CreditCard, Save, Crown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

const BRAND = '#534AB7'

const COUNTRIES = ['Sénégal', 'Côte d\'Ivoire', 'Cameroun', 'Mali', 'Bénin', 'Togo', 'Burkina Faso', 'Guinée', 'Madagascar', 'Congo', 'France', 'Autre']
const SUBJECTS_OPTIONS = ['Mathématiques', 'Français', 'Histoire-Géographie', 'SVT', 'Physique-Chimie', 'Anglais', 'Espagnol', 'Philosophie', 'Arts', 'EPS', 'Technologie', 'Autre']

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)

  // Profile fields
  const [firstName, setFirstName] = useState('Marie')
  const [lastName, setLastName]   = useState('Dupont')
  const [email, setEmail]         = useState('marie.dupont@ecole.sn')
  const [country, setCountry]     = useState('Sénégal')
  const [subject, setSubject]     = useState('Mathématiques')

  // Preferences
  const [gradingSystem, setGradingSystem] = useState<'20' | '10' | 'letter'>('20')
  const [language, setLanguage]           = useState<'fr' | 'en'>('fr')

  const generationsUsed = 2
  const generationsLimit = 3

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

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

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1 — Profile */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User size={16} style={{ color: BRAND }} />
            <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: BRAND }}>Profil enseignant</h2>
          </div>
          <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
            {/* Avatar placeholder */}
            <div className="flex items-center gap-4">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-black text-white"
                style={{ backgroundColor: BRAND }}
              >
                {firstName[0]}{lastName[0]}
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
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-muted/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-muted/40" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-muted/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-2">
                <Label>Matière</Label>
                <select
                  className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  {SUBJECTS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
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
        </div>

        {/* Save button */}
        <Button
          type="submit"
          className="w-full h-11 text-white font-bold gap-2"
          style={{ backgroundColor: saved ? '#22c55e' : BRAND }}
        >
          {saved ? <><Check size={16} /> Enregistré !</> : <><Save size={16} /> Enregistrer les modifications</>}
        </Button>
      </form>

      {/* Section 3 — Plan & Billing (outside form) */}
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
            <Button
              className="w-full text-white font-bold h-10"
              style={{ backgroundColor: BRAND }}
            >
              <Crown size={15} className="mr-2" /> Passer au Pro — 9€/mois
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
