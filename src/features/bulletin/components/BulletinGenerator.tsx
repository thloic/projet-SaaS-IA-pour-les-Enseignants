'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check, Copy, MessageSquare, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/shared/ToastProvider'
import {
  deleteBulletinAction,
  generateBulletinAction,
  type BulletinCommentListItem,
} from '@/features/bulletin/server/bulletin.actions'

const BRAND = '#534AB7'

type Tone = 'bienveillant' | 'encourageant' | 'factuel'

const TONES: { value: Tone; label: string; desc: string }[] = [
  { value: 'bienveillant', label: 'Bienveillant', desc: 'Chaleureux et positif' },
  { value: 'encourageant', label: 'Encourageant', desc: 'Motivant, axé sur le progrès' },
  { value: 'factuel',      label: 'Factuel',      desc: 'Précis et objectif' },
]

const SUBJECTS = ['Mathématiques', 'Français', 'Histoire-Géo', 'SVT', 'Physique-Chimie', 'Anglais', 'Espagnol', 'Philosophie', 'EPS', 'Arts plastiques']

interface BulletinGeneratorProps {
  initialBulletins: BulletinCommentListItem[]
  loadError: string | null
}

export default function BulletinGenerator({ initialBulletins, loadError }: BulletinGeneratorProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [studentName, setStudentName] = useState('')
  const [subject, setSubject] = useState('Mathématiques')
  const [grade, setGrade] = useState('')
  const [observations, setObservations] = useState('')
  const [tone, setTone] = useState<Tone>('bienveillant')
  const [result, setResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isGeneratePending, startGenerateTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()

  function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setResult(null)
    setError(null)

    const formData = new FormData(event.currentTarget)
    startGenerateTransition(async () => {
      const nextState = await generateBulletinAction({ error: null, comment: null }, formData)
      if (nextState.error) {
        setError(nextState.error)
        showToast(nextState.error, 'error')
        return
      }

      if (nextState.comment) {
        setResult(nextState.comment)
        showToast('Commentaire généré et enregistré.', 'success')
        router.refresh()
      }
    })
  }

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleHistoryCopy(item: BulletinCommentListItem) {
    navigator.clipboard.writeText(item.comment).then(() => {
      setCopiedHistoryId(item.id)
      setTimeout(() => setCopiedHistoryId(null), 2000)
    })
  }

  function handleReset() {
    setResult(null)
    setStudentName('')
    setGrade('')
    setObservations('')
  }

  function handleDelete(item: BulletinCommentListItem) {
    setDeletingId(item.id)
    startDeleteTransition(async () => {
      const deleteState = await deleteBulletinAction(item.id)
      setDeletingId(null)
      if (deleteState.error) {
        showToast(deleteState.error, 'error')
        return
      }
      showToast('Commentaire supprimé.', 'success')
      router.refresh()
    })
  }

  const isSubmitDisabled = isGeneratePending || !studentName.trim() || !grade.trim()

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

      {loadError && (
        <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-200">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      <form onSubmit={handleGenerate} className="space-y-5" noValidate>
        {/* Student + Subject */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="studentName">Prénom de l&apos;élève</Label>
            <Input
              id="studentName"
              name="student_name"
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
              name="subject"
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
            name="grade"
            placeholder="Ex : 14/20 ou Bien"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            required
            className="bg-muted/40"
          />
        </div>

        {/* Observations */}
        <div className="space-y-2">
          <Label htmlFor="observations">Observations libres</Label>
          <textarea
            id="observations"
            name="observations"
            rows={3}
            maxLength={500}
            placeholder="Points forts, difficultés, comportement, participation…"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        {/* Tone selector */}
        <div className="space-y-3">
          <Label>Ton du commentaire</Label>
          <input type="hidden" name="tone" value={tone} />
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

        <div
          onClick={
            !isGeneratePending && isSubmitDisabled
              ? () =>
                  showToast(
                    !studentName.trim()
                      ? "Indiquez le prénom de l’élève avant de générer le commentaire."
                      : 'Indiquez la note ou l’appréciation avant de générer le commentaire.',
                    'error'
                  )
              : undefined
          }
        >
          <Button
            type="submit"
            className={`w-full h-12 text-base text-white font-bold flex items-center gap-2 ${isSubmitDisabled ? 'pointer-events-none' : ''}`}
            style={{ backgroundColor: BRAND }}
            disabled={isSubmitDisabled}
          >
            {isGeneratePending ? (
              <><Sparkles size={18} className="animate-spin" /> Génération…</>
            ) : (
              <><Sparkles size={18} /> Générer le commentaire</>
            )}
          </Button>
        </div>
      </form>

      {error && (
        <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={17} className="text-muted-foreground" />
          <h2 className="text-lg font-bold">Historique des commentaires</h2>
        </div>

        {initialBulletins.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            Aucun commentaire généré pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {initialBulletins.map((item) => (
              <article key={item.id} className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{item.student_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {item.subject} · {item.grade} · {new Date(item.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
                    {item.tone}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{item.comment}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 sm:flex-1"
                    onClick={() => handleHistoryCopy(item)}
                  >
                    {copiedHistoryId === item.id ? (
                      <><Check size={15} className="text-emerald-400" /> Copié !</>
                    ) : (
                      <><Copy size={15} /> Copier</>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="gap-2 sm:w-auto"
                    disabled={isDeletePending && deletingId === item.id}
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 size={15} />
                    {isDeletePending && deletingId === item.id ? 'Suppression…' : 'Supprimer'}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
