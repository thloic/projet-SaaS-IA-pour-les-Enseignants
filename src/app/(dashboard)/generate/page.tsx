'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Plus,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

const BRAND = '#534AB7'

const LEVELS = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale', 'BTS', 'Licence']
const DURATIONS = [30, 45, 55, 60, 90, 120]
const ACTIVITY_TYPES = ['Cours magistral', 'Exercices', 'Travail en groupe', 'Débat', 'Jeu pédagogique', 'Vidéo', 'TP pratique', 'Évaluation']
const SUBJECTS = ['Mathématiques', 'Français', 'Histoire-Géographie', 'SVT', 'Physique-Chimie', 'Anglais', 'Espagnol', 'Philosophie', 'Économie', 'Arts plastiques', 'EPS', 'Technologie']

export default function GeneratePage() {
  const router = useRouter()

  const [subject, setSubject] = useState('Mathématiques')
  const [level, setLevel] = useState('3ème')
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState(55)
  const [objectives, setObjectives] = useState<string[]>([''])
  const [activities, setActivities] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const generationsUsed = 2
  const generationsLimit = 3
  const limitReached = generationsUsed >= generationsLimit

  function addObjective() {
    setObjectives((v) => [...v, ''])
  }

  function updateObjective(i: number, val: string) {
    setObjectives((v) => v.map((o, idx) => (idx === i ? val : o)))
  }

  function removeObjective(i: number) {
    setObjectives((v) => v.filter((_, idx) => idx !== i))
  }

  function toggleActivity(act: string) {
    setActivities((v) =>
      v.includes(act) ? v.filter((a) => a !== act) : [...v, act]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (limitReached) return
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      router.push('/history')
    }, 2000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="h-11 w-11 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${BRAND}20` }}
        >
          <BookOpen size={22} style={{ color: BRAND }} />
        </div>
        <div>
          <h1 className="text-2xl font-black">Nouveau cours</h1>
          <p className="text-sm text-muted-foreground">
            Remplissez le formulaire — l&apos;IA s&apos;occupe du reste
          </p>
        </div>
        <div className="ml-auto">
          <Badge
            className={`text-xs ${
              limitReached
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : generationsUsed >= generationsLimit - 1
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {generationsUsed}/{generationsLimit} générations
          </Badge>
        </div>
      </div>

      {/* Quota warning */}
      {limitReached && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <AlertTriangle size={16} className="shrink-0" />
          Vous avez atteint votre limite. Passez au plan Pro pour continuer.
          <Button
            className="ml-auto text-white text-xs h-7 shrink-0"
            style={{ backgroundColor: BRAND }}
          >
            Passer au Pro
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Matière + Niveau */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Matière</Label>
            <select
              className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Niveau</Label>
            <select
              className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sujet */}
        <div className="space-y-2">
          <Label htmlFor="topic">Thème du cours</Label>
          <Input
            id="topic"
            placeholder="Ex : Les fractions — introduction et addition"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            className="bg-muted/40"
          />
        </div>

        {/* Durée */}
        <div className="space-y-2">
          <Label>Durée de la séance</Label>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  duration === d
                    ? 'text-white border-transparent'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
                style={duration === d ? { backgroundColor: BRAND } : {}}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>

        {/* Objectifs */}
        <div className="space-y-3">
          <Label>Objectifs pédagogiques</Label>
          <div className="space-y-2">
            {objectives.map((obj, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 text-center">{i + 1}.</span>
                <Input
                  placeholder={`Objectif ${i + 1}...`}
                  value={obj}
                  onChange={(e) => updateObjective(i, e.target.value)}
                  className="flex-1 bg-muted/40"
                />
                {objectives.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeObjective(i)}
                    className="text-muted-foreground hover:text-rose-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {objectives.length < 5 && (
            <button
              type="button"
              onClick={addObjective}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus size={14} /> Ajouter un objectif
            </button>
          )}
        </div>

        {/* Types d'activités */}
        <div className="space-y-3">
          <Label>Types d&apos;activités souhaités</Label>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_TYPES.map((act) => (
              <button
                key={act}
                type="button"
                onClick={() => toggleActivity(act)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activities.includes(act)
                    ? 'text-white border-transparent'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
                style={activities.includes(act) ? { backgroundColor: BRAND } : {}}
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isLoading || limitReached || !topic.trim()}
          className="w-full h-12 text-base text-white font-bold flex items-center gap-2"
          style={{ backgroundColor: BRAND }}
        >
          {isLoading ? (
            <>
              <Sparkles size={18} className="animate-spin" />
              Génération en cours…
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Générer le cours
              <ChevronRight size={16} />
            </>
          )}
        </Button>
      </form>
    </div>
  )
}

