'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  Check,
  Gauge,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  UserRoundCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useConfirm } from '@/components/shared/ConfirmProvider'
import { useToast } from '@/components/shared/ToastProvider'
import {
  createClassAction,
  deleteClassAction,
  updateClassAction,
} from '@/features/classroom/server/classroom.actions'
import type {
  ClassOverviewItem,
  ClassroomOverviewData,
} from '@/features/classroom/types/classroomDashboard.types'
import { GlobalAttendanceChart } from '@/features/classroom/charts/ClassroomCharts'

interface ClassroomHomeProps {
  initialData?: ClassroomOverviewData
  subjects?: string[]
}

interface ClassForm {
  name: string
  level: string
  subject: string
}

const EMPTY_FORM: ClassForm = { name: '', level: '', subject: '' }
const EMPTY_OVERVIEW: ClassroomOverviewData = {
  classes: [],
  metrics: {
    classCount: 0,
    studentCount: 0,
    attendanceRate: null,
    attentionCount: 0,
  },
}

function formatRate(value: number | null) {
  return value === null ? '—' : `${value} %`
}

function rateColor(value: number | null) {
  if (value === null) return 'bg-muted-foreground/25'
  if (value >= 90) return 'bg-emerald-500'
  if (value >= 80) return 'bg-amber-500'
  return 'bg-rose-500'
}

export default function ClassroomHome({
  initialData = EMPTY_OVERVIEW,
  subjects = [],
}: ClassroomHomeProps) {
  const router = useRouter()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const [classes, setClasses] = useState(initialData.classes)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<ClassForm>(EMPTY_FORM)
  const [editingClass, setEditingClass] = useState<ClassOverviewItem | null>(null)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visibleClasses = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr')
    if (!normalized) return classes
    return classes.filter((item) =>
      `${item.name} ${item.level} ${item.subject}`.toLocaleLowerCase('fr').includes(normalized)
    )
  }, [classes, query])

  const metrics = useMemo(() => {
    const knownRates = classes
      .map((item) => item.attendanceRate)
      .filter((value): value is number => value !== null)
    return {
      classCount: classes.length,
      studentCount: classes.reduce((sum, item) => sum + item.studentCount, 0),
      attendanceRate:
        knownRates.length > 0
          ? Math.round(knownRates.reduce((sum, value) => sum + value, 0) / knownRates.length)
          : initialData.metrics.attendanceRate,
      attentionCount: classes.reduce((sum, item) => sum + item.attentionCount, 0),
    }
  }, [classes, initialData.metrics.attendanceRate])

  function openCreate() {
    setForm({ ...EMPTY_FORM, subject: subjects[0] ?? '' })
    setEditingClass(null)
    setError(null)
    setDialogMode('create')
  }

  // Garde la matiere de la classe visible dans le select meme si elle ne
  // figure plus (ou jamais figure) dans les matieres du profil enseignant —
  // evite de perdre/ecraser silencieusement une valeur existante en edition.
  const subjectOptions =
    form.subject && !subjects.includes(form.subject) ? [form.subject, ...subjects] : subjects

  function openEdit(item: ClassOverviewItem) {
    setForm({ name: item.name, level: item.level, subject: item.subject })
    setEditingClass(item)
    setError(null)
    setDialogMode('edit')
  }

  async function saveClass(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    const result =
      dialogMode === 'edit' && editingClass
        ? await updateClassAction(editingClass.id, form)
        : await createClassAction(form)

    setIsSaving(false)
    if (result.error || !result.data) {
      setError(result.error ?? 'Impossible d’enregistrer cette classe.')
      return
    }

    if (dialogMode === 'edit') {
      setClasses((current) =>
        current.map((item) =>
          item.id === result.data!.id
            ? {
                ...item,
                name: result.data!.name,
                level: result.data!.level,
                subject: result.data!.subject,
              }
            : item
        )
      )
      showToast('Classe mise à jour.', 'success')
    } else {
      setClasses((current) => [
        ...current,
        {
          id: result.data!.id,
          name: result.data!.name,
          level: result.data!.level,
          subject: result.data!.subject,
          studentCount: 0,
          attendanceRate: null,
          absenceCount: 0,
          lateCount: 0,
          attentionCount: 0,
          activeSessionId: null,
          lastSessionDate: null,
        },
      ])
      showToast('Classe créée.', 'success')
    }

    setDialogMode(null)
    router.refresh()
  }

  async function removeClass(item: ClassOverviewItem) {
    const accepted = await confirm({
      title: 'Supprimer cette classe ?',
      message: `« ${item.name} » et toutes ses séances seront définitivement supprimées.`,
      confirmLabel: 'Supprimer',
    })
    if (!accepted) return

    setDeletingId(item.id)
    const result = await deleteClassAction(item.id)
    setDeletingId(null)
    if (result.error) {
      showToast(result.error, 'error')
      return
    }
    setClasses((current) => current.filter((classroom) => classroom.id !== item.id))
    showToast('Classe supprimée.', 'success')
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24 lg:pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpenCheck size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-black">Mes classes</h1>
            <p className="text-sm text-muted-foreground">
              Présences, participation et suivi pédagogique en un coup d’œil.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="min-h-10">
          <Plus /> Nouvelle classe
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Classes"
          value={String(metrics.classCount)}
          icon={BookOpenCheck}
          tone="violet"
        />
        <Metric
          label="Élèves"
          value={String(metrics.studentCount)}
          icon={UsersRound}
          tone="blue"
        />
        <Metric
          label="Présence sur 30 jours"
          value={formatRate(metrics.attendanceRate)}
          icon={UserRoundCheck}
          tone="green"
        />
        <Metric
          label="Suivis à vérifier"
          value={String(metrics.attentionCount)}
          icon={AlertCircle}
          tone="amber"
        />
      </section>

      {classes.length > 0 && (
        <section className="rounded-lg border border-border bg-card/40 p-4 sm:p-5">
          <div className="mb-2">
            <h2 className="font-bold">Présence par classe</h2>
            <p className="text-sm text-muted-foreground">
              Comparaison des appels enregistrés sur les 30 derniers jours.
            </p>
          </div>
          <GlobalAttendanceChart classes={classes} />
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une classe, un niveau ou une matière..."
              className="min-h-10 pl-9"
            />
          </div>
          <Badge variant="outline">
            {visibleClasses.length} classe{visibleClasses.length > 1 ? 's' : ''}
          </Badge>
        </div>

        {classes.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
            <BookOpenCheck size={30} className="mb-3 text-primary" />
            <h2 className="font-bold">Créez votre première classe</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Ajoutez ensuite vos élèves pour démarrer les présences et le suivi.
            </p>
            <Button onClick={openCreate} className="mt-5">
              <Plus /> Nouvelle classe
            </Button>
          </div>
        ) : visibleClasses.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            Aucune classe ne correspond à cette recherche.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleClasses.map((item) => (
              <article
                key={item.id}
                className="flex min-h-64 min-w-0 flex-col rounded-lg border border-border bg-card/50 p-4 transition-colors hover:border-primary/35"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">{item.name}</h2>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {item.level} · {item.subject}
                    </p>
                  </div>
                  {item.activeSessionId ? (
                    <Badge className="bg-emerald-600 text-white">En cours</Badge>
                  ) : (
                    <Badge variant="outline">
                      {item.lastSessionDate ? 'Suivie' : 'Nouvelle'}
                    </Badge>
                  )}
                </div>

                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Présence · 30 jours</p>
                    <p className="mt-1 text-2xl font-black">{formatRate(item.attendanceRate)}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{item.studentCount} élève{item.studentCount > 1 ? 's' : ''}</p>
                    <p>{item.lateCount} retard{item.lateCount > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${rateColor(item.attendanceRate)}`}
                    style={{ width: `${item.attendanceRate ?? 0}%` }}
                  />
                </div>

                <div className="mt-4 flex min-h-7 flex-wrap gap-2 text-xs">
                  {item.absenceCount > 0 && (
                    <span className="rounded-md bg-rose-500/10 px-2 py-1 text-rose-700 dark:text-rose-300">
                      {item.absenceCount} absence{item.absenceCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {item.attentionCount > 0 && (
                    <span className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
                      {item.attentionCount} suivi{item.attentionCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {item.absenceCount === 0 && item.attentionCount === 0 && (
                    <span className="text-muted-foreground">Aucun signal récent</span>
                  )}
                </div>

                <div className="mt-auto grid grid-cols-[1fr_1fr_auto] gap-2 pt-5">
                  <Button asChild variant="outline" className="min-w-0">
                    <Link href={`/classroom/${item.id}`}>
                      Tableau <ArrowRight />
                    </Link>
                  </Button>
                  <Button asChild className="min-w-0">
                    <Link href={`/classroom/${item.id}/session`}>
                      <Play /> {item.activeSessionId ? 'Reprendre' : 'Démarrer'}
                    </Link>
                  </Button>
                  <div className="flex">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title="Modifier"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      title="Supprimer"
                      disabled={deletingId === item.id}
                      onClick={() => void removeClass(item)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {dialogMode && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center sm:p-4">
          <form
            onSubmit={saveClass}
            className="w-full rounded-t-lg border border-border bg-card p-5 shadow-xl sm:max-w-md sm:rounded-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">
                  {dialogMode === 'create' ? 'Nouvelle classe' : 'Modifier la classe'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Renseignez le groupe, son niveau et la matière principale.
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setDialogMode(null)}
                aria-label="Fermer"
              >
                <X />
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="class-name">Nom de la classe</Label>
                <Input
                  id="class-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Ex : Groupe 201"
                  className="min-h-10"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="class-level">Niveau</Label>
                  <Input
                    id="class-level"
                    value={form.level}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, level: event.target.value }))
                    }
                    placeholder="Secondaire 2"
                    className="min-h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class-subject">Matière</Label>
                  {subjectOptions.length > 0 ? (
                    <select
                      id="class-subject"
                      value={form.subject}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, subject: event.target.value }))
                      }
                      className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="" disabled>
                        Sélectionnez une matière
                      </option>
                      {subjectOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="class-subject"
                      value={form.subject}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, subject: event.target.value }))
                      }
                      placeholder="Mathématiques"
                      className="min-h-10"
                    />
                  )}
                </div>
              </div>
              {error && (
                <div className="flex gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogMode(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSaving}>
                  <Check /> {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof Gauge
  tone: 'violet' | 'blue' | 'green' | 'amber'
}) {
  const tones = {
    violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    blue: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    green: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  }

  return (
    <div className="flex min-h-24 min-w-0 items-center gap-3 rounded-lg border border-border bg-card/50 p-3 sm:p-4">
      <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:flex ${tones[tone]}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <strong className="block text-xl font-black sm:text-2xl">{value}</strong>
        <span className="block break-words text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  )
}
