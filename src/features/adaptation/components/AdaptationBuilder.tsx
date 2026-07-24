'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Type,
  UploadCloud,
  UsersRound,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/shared/ToastProvider'
import { extractDocumentTextAction } from '@/features/documents/server/document.actions'
import type {
  AdaptationSourceOption,
  AdaptationStudentOption,
} from '@/features/adaptation/types/adaptation.types'
import type {
  AdaptationSourceType,
  VariantType,
} from '@/features/adaptation/schemas/adaptationSchema'

const VARIANTS: Array<{ type: VariantType; label: string; description: string }> = [
  { type: 'standard', label: 'Standard', description: 'Version claire et optimisée' },
  { type: 'support', label: 'Soutien', description: 'Étapes guidées et vocabulaire simplifié' },
  { type: 'dys', label: 'DYS', description: 'Lecture aérée et consignes explicites' },
  { type: 'adhd', label: 'TDAH', description: 'Micro-étapes et repères visuels' },
  { type: 'enrichment', label: 'Enrichissement', description: 'Défis et approfondissement' },
]

type ProgressStatus = 'waiting' | 'generating' | 'complete' | 'failed'

interface AdaptationBuilderProps {
  sources: AdaptationSourceOption[]
  students: AdaptationStudentOption[]
  defaultSubject: string
  defaultLevel: string
  initialSourceType?: 'course' | 'document'
  initialSourceId?: string
}

export default function AdaptationBuilder({
  sources,
  students,
  defaultSubject,
  defaultLevel,
  initialSourceType,
  initialSourceId,
}: AdaptationBuilderProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const abortRef = useRef<AbortController | null>(null)

  const initialSource = sources.find(
    (source) => source.id === initialSourceId && source.type === initialSourceType
  )
  const [sourceType, setSourceType] = useState<AdaptationSourceType>(
    initialSource?.type ?? (sources.some((source) => source.type === 'course') ? 'course' : 'paste')
  )
  const [sourceId, setSourceId] = useState(initialSource?.id ?? '')
  const [title, setTitle] = useState(initialSource?.title ?? '')
  const [subject, setSubject] = useState(initialSource?.subject ?? defaultSubject)
  const [level, setLevel] = useState(initialSource?.level ?? defaultLevel)
  const [content, setContent] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Record<VariantType, ProgressStatus>>({
    standard: 'waiting',
    support: 'waiting',
    dys: 'waiting',
    adhd: 'waiting',
    enrichment: 'waiting',
  })

  const selectedSource = sources.find(
    (source) => source.id === sourceId && source.type === sourceType
  )
  const classes = useMemo(
    () => Array.from(new Set(students.map((student) => student.className))),
    [students]
  )
  const sourceOptions = sources.filter((source) => source.type === sourceType)

  function chooseSource(nextId: string) {
    setSourceId(nextId)
    const source = sources.find((item) => item.id === nextId)
    if (!source) return
    setTitle(source.title)
    if (source.subject) setSubject(source.subject)
    if (source.level) setLevel(source.level)
  }

  function changeSourceType(nextType: AdaptationSourceType) {
    setSourceType(nextType)
    setSourceId('')
    setContent('')
    setTitle('')
  }

  function toggleStudent(studentId: string) {
    setSelectedStudents((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    )
  }

  function toggleClass(className: string) {
    const ids = students
      .filter((student) => student.className === className)
      .map((student) => student.id)
    const allSelected = ids.every((id) => selectedStudents.includes(id))
    setSelectedStudents((current) =>
      allSelected
        ? current.filter((id) => !ids.includes(id))
        : Array.from(new Set([...current, ...ids]))
    )
  }

  async function readFile(file?: File) {
    if (!file) return
    setIsReadingFile(true)
    setError(null)
    try {
      const result = await extractDocumentTextAction(file)
      if (result.error || !result.text) throw new Error(result.error ?? 'Fichier vide.')
      setContent(result.text)
      setTitle(file.name.replace(/\.(pdf|docx|txt)$/i, ''))
      if (result.warning) showToast(result.warning, 'error')
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Impossible de lire ce fichier.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsReadingFile(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!title.trim() || !subject.trim() || !level.trim()) {
      setError('Complétez le titre, la matière et le niveau.')
      return
    }
    if ((sourceType === 'course' || sourceType === 'document') && !sourceId) {
      setError('Choisissez le contenu à adapter.')
      return
    }
    if ((sourceType === 'paste' || sourceType === 'upload') && content.trim().length < 20) {
      setError('Ajoutez un contenu de cours suffisamment détaillé.')
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setIsGenerating(true)
    setProgress({
      standard: 'waiting',
      support: 'waiting',
      dys: 'waiting',
      adhd: 'waiting',
      enrichment: 'waiting',
    })

    try {
      const response = await fetch('/api/adaptations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          sourceId: sourceId || undefined,
          title,
          pastedText: content || undefined,
          subject,
          level,
          studentIds: selectedStudents,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'La génération a échoué.')
      }

      if (response.headers.get('content-type')?.includes('application/json')) {
        const payload = await response.json()
        showToast('Une adaptation identique existait déjà. Elle a été réutilisée.', 'success')
        router.push(`/adaptations/${payload.adaptationId}`)
        return
      }

      if (!response.body) throw new Error('Le suivi de la génération est indisponible.')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let adaptationId = response.headers.get('X-Adaptation-Id')

      while (true) {
        const { done, value } = await reader.read()
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          const eventData = JSON.parse(line) as {
            type: string
            variantType?: VariantType
            adaptationId?: string
            completedVariants?: number
          }
          if (eventData.adaptationId) adaptationId = eventData.adaptationId
          if (eventData.variantType && eventData.type === 'variant_started') {
            setProgress((current) => ({ ...current, [eventData.variantType!]: 'generating' }))
          }
          if (eventData.variantType && eventData.type === 'variant_complete') {
            setProgress((current) => ({ ...current, [eventData.variantType!]: 'complete' }))
          }
          if (eventData.variantType && eventData.type === 'variant_failed') {
            setProgress((current) => ({ ...current, [eventData.variantType!]: 'failed' }))
          }
        }

        if (done) break
      }

      if (!adaptationId) throw new Error('L’adaptation générée est introuvable.')
      showToast('Les variantes sont prêtes.', 'success')
      router.push(`/adaptations/${adaptationId}`)
      router.refresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof DOMException && caughtError.name === 'AbortError'
          ? 'Génération annulée. Les variantes déjà terminées restent enregistrées.'
          : caughtError instanceof Error
            ? caughtError.message
            : 'La génération a échoué.'
      setError(message)
      showToast(message, 'error')
    } finally {
      abortRef.current = null
      setIsGenerating(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24 lg:pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black">Adapter une leçon</h1>
              <p className="text-sm text-muted-foreground">
                Cinq versions prêtes pour les différents profils de votre classe.
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push('/adaptations')}>
          Voir ma banque
        </Button>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="space-y-5 rounded-xl border border-border bg-card/50 p-4 sm:p-5">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Étape 1</p>
              <h2 className="text-lg font-bold">Choisissez votre leçon</h2>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { type: 'course' as const, label: 'Mes cours', icon: BookOpen },
                { type: 'document' as const, label: 'Documents', icon: FileText },
                { type: 'upload' as const, label: 'Importer', icon: UploadCloud },
                { type: 'paste' as const, label: 'Coller', icon: Type },
              ].map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => changeSourceType(type)}
                  className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border px-2 py-3 text-sm font-semibold transition-colors ${
                    sourceType === type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <Icon size={19} />
                  {label}
                </button>
              ))}
            </div>

            {(sourceType === 'course' || sourceType === 'document') && (
              <div className="space-y-2">
                <Label htmlFor="adaptation-source">
                  {sourceType === 'course' ? 'Cours enregistré' : 'Document source'}
                </Label>
                <select
                  id="adaptation-source"
                  value={sourceId}
                  onChange={(event) => chooseSource(event.target.value)}
                  disabled={isGenerating}
                  className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Choisir...</option>
                  {sourceOptions.map((source) => (
                    <option key={source.id} value={source.id}>{source.title}</option>
                  ))}
                </select>
                {sourceOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucun élément disponible. Utilisez l’import ou collez votre texte.
                  </p>
                )}
              </div>
            )}

            {sourceType === 'upload' && (
              <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center hover:bg-muted/40">
                {isReadingFile ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                <span className="font-semibold">
                  {isReadingFile ? 'Lecture du fichier...' : 'Choisir un PDF, DOCX ou TXT'}
                </span>
                <span className="text-xs text-muted-foreground">8 Mo maximum</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="sr-only"
                  disabled={isGenerating || isReadingFile}
                  onChange={(event) => void readFile(event.target.files?.[0])}
                />
              </label>
            )}

            {(sourceType === 'paste' || (sourceType === 'upload' && content)) && (
              <div className="space-y-2">
                <Label htmlFor="adaptation-content">
                  {sourceType === 'upload' ? 'Texte extrait' : 'Contenu de la leçon'}
                </Label>
                <textarea
                  id="adaptation-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value.slice(0, 30000))}
                  disabled={isGenerating}
                  rows={10}
                  placeholder="Collez ici le cours, l’exercice ou l’évaluation à adapter..."
                  className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-right text-xs text-muted-foreground">{content.length}/30 000</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="adaptation-title">Titre</Label>
                <Input
                  id="adaptation-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={selectedSource?.title ?? 'Ex : Comprendre les fractions'}
                  disabled={isGenerating}
                  className="min-h-10"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="adaptation-subject">Matière</Label>
                <Input
                  id="adaptation-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  disabled={isGenerating}
                  className="min-h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adaptation-level">Niveau</Label>
                <Input
                  id="adaptation-level"
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  disabled={isGenerating}
                  className="min-h-10"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card/50 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Étape 2 · facultatif</p>
                <h2 className="text-lg font-bold">Ciblez votre classe</h2>
                <p className="text-sm text-muted-foreground">
                  Les besoins sont utilisés anonymement pour calibrer les variantes.
                </p>
              </div>
              {selectedStudents.length > 0 && (
                <Badge variant="outline">{selectedStudents.length} élève(s)</Badge>
              )}
            </div>

            {students.length === 0 ? (
              <div className="flex gap-3 rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
                <UsersRound className="shrink-0" size={18} />
                Ajoutez des élèves dans Gestion de classe pour activer le ciblage automatique.
              </div>
            ) : (
              <div className="space-y-4">
                {classes.map((className) => {
                  const classStudents = students.filter((student) => student.className === className)
                  const allSelected = classStudents.every((student) =>
                    selectedStudents.includes(student.id)
                  )
                  return (
                    <div key={className} className="space-y-2">
                      <button
                        type="button"
                        onClick={() => toggleClass(className)}
                        disabled={isGenerating}
                        className="flex w-full items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-left text-sm font-semibold"
                      >
                        <span>{className}</span>
                        <span className="text-xs text-muted-foreground">
                          {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </span>
                      </button>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {classStudents.map((student) => {
                          const selected = selectedStudents.includes(student.id)
                          return (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => toggleStudent(student.id)}
                              disabled={isGenerating}
                              className={`flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                                selected
                                  ? 'border-primary bg-primary/8'
                                  : 'border-border hover:bg-muted/30'
                              }`}
                            >
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                              }`}>
                                {selected && <Check size={13} />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">
                                  {student.firstName} {student.lastName}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  Suggestion : {VARIANTS.find((item) => item.type === student.suggestedVariant)?.label}
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="space-y-4 rounded-xl border border-border bg-card/70 p-4">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Étape 3</p>
              <h2 className="font-bold">Vos cinq variantes</h2>
            </div>
            <div className="space-y-2">
              {VARIANTS.map((variant) => {
                const status = progress[variant.type]
                return (
                  <div key={variant.type} className="flex min-h-16 items-center gap-3 rounded-lg border border-border p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                      {status === 'generating' ? (
                        <Loader2 size={16} className="animate-spin text-primary" />
                      ) : status === 'complete' ? (
                        <CheckCircle2 size={17} className="text-emerald-600" />
                      ) : status === 'failed' ? (
                        <AlertCircle size={17} className="text-rose-600" />
                      ) : (
                        <FileText size={16} className="text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{variant.label}</span>
                      <span className="block text-xs text-muted-foreground">{variant.description}</span>
                    </span>
                  </div>
                )
              })}
            </div>

            {error && (
              <div className="flex gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isGenerating ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => abortRef.current?.abort()}
                className="min-h-11 w-full"
              >
                <X /> Annuler
              </Button>
            ) : (
              <Button type="submit" className="min-h-11 w-full">
                <Sparkles /> Générer les 5 variantes
              </Button>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Une génération est comptée pour l’ensemble des cinq versions.
            </p>
          </section>
        </aside>
      </form>
    </div>
  )
}
