'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/shared/ToastProvider'
import MarkdownContent from '@/features/generation/components/MarkdownContent'
import type { CourseListItem } from '@/features/generation/server/courses'

const BRAND = '#534AB7'
const DURATIONS = [30, 45, 60, 90, 120]
const ACTIVITY_TYPES = ['Cours magistral', 'Exercices', 'Travail en groupe', 'Débat', 'Jeu pédagogique', 'Vidéo', 'TP pratique', 'Évaluation']

type GenerationStatus = 'idle' | 'streaming' | 'complete' | 'error'

interface CourseGenerationFormProps {
  subjects: string[]
  levels: string[]
  courses: CourseListItem[]
}

function statusLabel(status: CourseListItem['status']) {
  if (status === 'complete') return 'Terminé'
  if (status === 'generating') return 'En cours'
  return 'Échec'
}

function statusClass(status: CourseListItem['status']) {
  if (status === 'complete') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  if (status === 'generating') return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
  return 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
}

export default function CourseGenerationForm({ subjects, levels, courses }: CourseGenerationFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const abortControllerRef = useRef<AbortController | null>(null)

  const [subject, setSubject] = useState(subjects[0] ?? '')
  const [level, setLevel] = useState(levels[0] ?? '')
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState(60)
  const [objectives, setObjectives] = useState<string[]>([''])
  const [activities, setActivities] = useState<string[]>([])
  const [content, setContent] = useState('')
  const [courseId, setCourseId] = useState<string | null>(null)
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const isStreaming = status === 'streaming'

  function addObjective() {
    setObjectives((current) => [...current, ''])
  }

  function updateObjective(index: number, value: string) {
    setObjectives((current) => current.map((objective, currentIndex) => (currentIndex === index ? value : objective)))
  }

  function removeObjective(index: number) {
    setObjectives((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  function toggleActivity(activity: string) {
    setActivities((current) =>
      current.includes(activity)
        ? current.filter((item) => item !== activity)
        : [...current, activity]
    )
  }

  function getObjectivesText() {
    return objectives.map((objective) => objective.trim()).filter(Boolean).join('\n')
  }

  function stopGeneration() {
    abortControllerRef.current?.abort()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!subject.trim()) {
      showToast('Choisissez une matière avant de générer le cours.', 'error')
      return
    }

    if (!level.trim()) {
      showToast('Choisissez un niveau avant de générer le cours.', 'error')
      return
    }

    if (!topic.trim()) {
      showToast('Indiquez le thème du cours que vous souhaitez générer.', 'error')
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    setStatus('streaming')
    setError(null)
    setContent('')
    setCourseId(null)

    try {
      const response = await fetch('/api/course/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          level,
          topic,
          duration_minutes: duration,
          objectives: getObjectivesText() || undefined,
          activities,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'La génération du cours a échoué.')
      }

      const nextCourseId = response.headers.get('X-Course-Id')
      setCourseId(nextCourseId)

      if (!response.body) {
        throw new Error('Le flux de génération est indisponible.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setContent((current) => current + chunk)
      }

      setStatus('complete')
      showToast('Cours généré et enregistré.', 'success')
      router.refresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof DOMException && caughtError.name === 'AbortError'
          ? 'Génération annulée.'
          : caughtError instanceof Error
            ? caughtError.message
            : 'La génération du cours a échoué.'
      setError(message)
      setStatus('error')
      showToast(message, 'error')
      router.refresh()
    } finally {
      abortControllerRef.current = null
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${BRAND}20` }}
          >
            <BookOpen size={22} style={{ color: BRAND }} />
          </div>
          <div>
            <h1 className="text-2xl font-black">Nouveau cours</h1>
            <p className="text-sm text-muted-foreground">
              Générez une séquence pédagogique complète avec affichage progressif.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card/40 p-4 sm:p-5" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-2">
              <Label>Matière</Label>
              {subjects.length > 0 ? (
                <select
                  className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  disabled={isStreaming}
                >
                  {subjects.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              ) : (
                <Input value={subject} onChange={(event) => setSubject(event.target.value)} disabled={isStreaming} className="bg-muted/40" />
              )}
            </div>

            <div className="space-y-2">
              <Label>Niveau</Label>
              {levels.length > 0 ? (
                <select
                  className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  disabled={isStreaming}
                >
                  {levels.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              ) : (
                <Input value={level} onChange={(event) => setLevel(event.target.value)} disabled={isStreaming} className="bg-muted/40" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Thème du cours</Label>
            <Input
              id="topic"
              placeholder="Ex : Les fractions — introduction et addition"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              disabled={isStreaming}
              required
              className="bg-muted/40"
            />
          </div>

          <div className="space-y-2">
            <Label>Durée de la séance</Label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((durationOption) => (
                <button
                  key={durationOption}
                  type="button"
                  onClick={() => setDuration(durationOption)}
                  disabled={isStreaming}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                    duration === durationOption
                      ? 'border-transparent text-white'
                      : 'border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                  style={duration === durationOption ? { backgroundColor: BRAND } : undefined}
                >
                  {durationOption} min
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Objectifs pédagogiques</Label>
            <div className="space-y-2">
              {objectives.map((objective, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs text-muted-foreground">{index + 1}.</span>
                  <Input
                    placeholder={`Objectif ${index + 1}...`}
                    value={objective}
                    onChange={(event) => updateObjective(index, event.target.value)}
                    disabled={isStreaming}
                    className="flex-1 bg-muted/40"
                  />
                  {objectives.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeObjective(index)}
                      disabled={isStreaming}
                      className="text-muted-foreground transition-colors hover:text-rose-400 disabled:opacity-60"
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
                disabled={isStreaming}
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
              >
                <Plus size={14} /> Ajouter un objectif
              </button>
            )}
          </div>

          <div className="space-y-3">
            <Label>Types d&apos;activités souhaités</Label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_TYPES.map((activity) => (
                <button
                  key={activity}
                  type="button"
                  onClick={() => toggleActivity(activity)}
                  disabled={isStreaming}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                    activities.includes(activity)
                      ? 'border-transparent text-white'
                      : 'border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                  style={activities.includes(activity) ? { backgroundColor: BRAND } : undefined}
                >
                  {activity}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {isStreaming ? (
              <Button type="button" variant="destructive" onClick={stopGeneration} className="min-h-11 flex-1">
                <X size={16} /> Annuler
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!topic.trim()}
                className="min-h-11 flex-1 text-white"
                style={{ backgroundColor: BRAND }}
              >
                <Sparkles size={16} /> Générer le cours <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </form>

        <section className="min-h-[420px] rounded-2xl border border-border bg-card/40 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isStreaming ? (
                <Loader2 size={18} className="animate-spin text-primary" />
              ) : status === 'complete' ? (
                <CheckCircle2 size={18} className="text-emerald-500" />
              ) : (
                <BookOpen size={18} className="text-muted-foreground" />
              )}
              <h2 className="font-bold">Aperçu du cours</h2>
            </div>
            {courseId && status === 'complete' && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/courses/${courseId}`}>Ouvrir</Link>
              </Button>
            )}
          </div>

          {error && (
            <div className="mb-4 flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {content ? (
            <MarkdownContent content={content} />
          ) : (
            <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
              Le cours apparaîtra ici progressivement pendant la génération.
            </div>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-muted-foreground" />
          <h2 className="text-lg font-bold">Cours récents</h2>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            Aucun cours généré pour le moment.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {courses.map((course) => (
              <article key={course.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{course.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {course.subject} · {course.level} · {course.duration_minutes} min
                    </p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 ${statusClass(course.status)}`}>
                    {statusLabel(course.status)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{new Date(course.created_at).toLocaleDateString('fr-FR')}</span>
                  {course.status === 'complete' ? (
                    <Link href={`/courses/${course.id}`} className="font-medium text-primary hover:underline">
                      Consulter
                    </Link>
                  ) : (
                    <span>{course.status === 'generating' ? 'Génération non terminée' : 'Non sauvegardé complètement'}</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
