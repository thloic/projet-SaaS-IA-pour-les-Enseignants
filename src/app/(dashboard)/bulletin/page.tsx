'use client'

import { useState } from 'react'
import { MessageSquare, Sparkles, Copy, Check, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const BRAND = '#534AB7'

type Tone = 'bienveillant' | 'encourageant' | 'factuel'

const TONES: { value: Tone; label: string; desc: string }[] = [
  { value: 'bienveillant', label: 'Bienveillant', desc: 'Chaleureux et positif' },
  { value: 'encourageant', label: 'Encourageant', desc: 'Motivant, axé sur le progrès' },
  { value: 'factuel',      label: 'Factuel',      desc: 'Précis et objectif' },
]

const SUBJECTS = ['Mathématiques', 'Français', 'Histoire-Géo', 'SVT', 'Physique-Chimie', 'Anglais', 'Espagnol', 'Philosophie', 'EPS', 'Arts plastiques']

const mockComments: Record<Tone, string> = {
  bienveillant: "Amara est une élève sérieuse et investie qui fait preuve d'une belle curiosité pour les mathématiques. Elle a su maîtriser les notions d'algèbre abordées ce trimestre avec rigueur et persévérance. Son attitude positive en classe est appréciée par ses camarades et ses enseignants. Nous l'encourageons à continuer sur cette belle lancée.",
  encourageant: "Amara réalise un trimestre prometteur ! Ses résultats en mathématiques témoignent d'une réelle progression. Elle peut encore gagner en rapidité lors des évaluations, mais sa méthode de travail est solide. En continuant à s'entraîner régulièrement, elle a tous les atouts pour atteindre un excellent niveau. Bravo !",
  factuel: "Amara obtient une moyenne de 14/20 en mathématiques ce trimestre. Elle maîtrise les notions du programme mais commet encore des erreurs dans les exercices de géométrie. Les exercices d'application et de raisonnement sont bien réalisés. Des progrès sont attendus sur la précision des calculs.",
}

export default function BulletinPage() {
  const [studentName, setStudentName] = useState('')
  const [subject, setSubject] = useState('Mathématiques')
  const [grade, setGrade] = useState('')
  const [observations, setObservations] = useState('')
  const [tone, setTone] = useState<Tone>('bienveillant')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)
    setTimeout(() => {
      setIsLoading(false)
      setResult(mockComments[tone])
    }, 1600)
  }

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleReset() {
    setResult(null)
    setStudentName('')
    setGrade('')
    setObservations('')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-amber-500/20">
          <MessageSquare size={22} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Commentaire de bulletin</h1>
          <p className="text-sm text-muted-foreground">
            Générez un commentaire personnalisé en quelques secondes
          </p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-5">
        {/* Student + Subject */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="studentName">Prénom de l&apos;élève</Label>
            <Input
              id="studentName"
              placeholder="Ex : Amara"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              required
              className="bg-muted/40"
            />
          </div>
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
        </div>

        {/* Grade */}
        <div className="space-y-2">
          <Label htmlFor="grade">Note obtenue (facultatif)</Label>
          <Input
            id="grade"
            placeholder="Ex : 14/20 ou Bien"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="bg-muted/40"
          />
        </div>

        {/* Observations */}
        <div className="space-y-2">
          <Label htmlFor="observations">Observations libres</Label>
          <textarea
            id="observations"
            rows={3}
            placeholder="Points forts, difficultés, comportement, participation…"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        {/* Tone selector */}
        <div className="space-y-3">
          <Label>Ton du commentaire</Label>
          <div className="grid grid-cols-3 gap-2">
            {TONES.map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTone(value)}
                className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                  tone === value
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border bg-muted/20 hover:bg-muted/40'
                }`}
              >
                <p className="text-xs font-bold" style={tone === value ? { color: BRAND } : {}}>
                  {label}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base text-white font-bold flex items-center gap-2"
          style={{ backgroundColor: BRAND }}
          disabled={isLoading || !studentName.trim()}
        >
          {isLoading ? (
            <><Sparkles size={18} className="animate-spin" /> Génération…</>
          ) : (
            <><Sparkles size={18} /> Générer le commentaire</>
          )}
        </Button>
      </form>

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-muted/20 p-5">
            <p className="text-sm leading-relaxed">{result}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleCopy}
            >
              {copied ? <><Check size={15} className="text-emerald-400" /> Copié !</> : <><Copy size={15} /> Copier</>}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleReset}
            >
              <RefreshCw size={15} /> Recommencer
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

