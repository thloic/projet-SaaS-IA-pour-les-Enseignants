'use client'

import { useState } from 'react'
import { Download, FileText, Loader2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/shared/ToastProvider'
import { extractDocumentTextAction } from '@/features/documents/server/document.actions'
import {
  examVariantSetSchema,
  type ExamVariantSet,
} from '@/features/adaptation/schemas/examVariantSchema'

interface Props {
  defaultSubject: string
  defaultLevel: string
}

function downloadVariant(variant: ExamVariantSet['variants'][number]) {
  const content = [
    variant.title,
    '',
    ...variant.questions.map(
      (question, index) => `${index + 1}. ${question.prompt} (${question.points} points)`
    ),
  ].join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${variant.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function ExamVariantBuilder({ defaultSubject, defaultLevel }: Props) {
  const { showToast } = useToast()
  const [sourceTitle, setSourceTitle] = useState('')
  const [subject, setSubject] = useState(defaultSubject)
  const [level, setLevel] = useState(defaultLevel)
  const [sourceContent, setSourceContent] = useState('')
  const [result, setResult] = useState<ExamVariantSet | null>(null)
  const [isReading, setIsReading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function readFile(file?: File) {
    if (!file) return
    setIsReading(true)
    setError(null)
    try {
      const extracted = await extractDocumentTextAction(file)
      if (extracted.error || !extracted.text) throw new Error(extracted.error ?? 'Fichier vide.')
      setSourceContent(extracted.text.slice(0, 30000))
      setSourceTitle(file.name.replace(/\.(pdf|docx|txt)$/i, ''))
      if (extracted.warning) showToast(extracted.warning, 'error')
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Impossible de lire le fichier.'
      setError(message)
    } finally {
      setIsReading(false)
    }
  }

  async function generate(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setResult(null)
    setIsGenerating(true)
    try {
      const response = await fetch('/api/adaptations/exam-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceContent, sourceTitle, subject, level }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const message = payload && typeof payload === 'object' && 'error' in payload
          ? String(payload.error)
          : 'La génération a échoué.'
        throw new Error(message)
      }
      setResult(examVariantSetSchema.parse(payload))
      showToast('Les versions A, B et C sont prêtes.', 'success')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'La génération a échoué.')
    } finally {
      setIsGenerating(false)
    }
  }

  function updateQuestion(label: 'A' | 'B' | 'C', index: number, prompt: string) {
    setResult((current) => current && ({
      variants: current.variants.map((variant) => variant.label !== label ? variant : ({
        ...variant,
        questions: variant.questions.map((question, questionIndex) =>
          questionIndex === index ? { ...question, prompt } : question
        ),
      })),
    }))
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <header>
        <h1 className="text-2xl font-black">Variantes d’examen A/B/C</h1>
        <p className="text-sm text-muted-foreground">
          Trois versions équivalentes, avec le même nombre de questions et le même barème.
        </p>
      </header>

      <form onSubmit={generate} className="space-y-5 rounded-xl border border-border bg-card/50 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="exam-title">Titre de l’examen</Label>
            <Input id="exam-title" value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="exam-subject">Matière</Label>
            <Input id="exam-subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-level">Niveau</Label>
            <Input id="exam-level" value={level} onChange={(event) => setLevel(event.target.value)} />
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-border p-5 hover:bg-muted/30">
          {isReading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
          <span>{isReading ? 'Lecture...' : 'Importer un PDF, DOCX ou TXT'}</span>
          <input type="file" accept=".pdf,.docx,.txt" className="sr-only" onChange={(event) => void readFile(event.target.files?.[0])} />
        </label>

        <div className="space-y-2">
          <Label htmlFor="exam-content">Contenu de l’examen original</Label>
          <textarea
            id="exam-content"
            value={sourceContent}
            onChange={(event) => setSourceContent(event.target.value.slice(0, 30000))}
            rows={12}
            placeholder="Collez les questions de l’examen original..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={isGenerating || isReading}>
          {isGenerating ? <Loader2 className="animate-spin" /> : <FileText />}
          Générer A, B et C
        </Button>
      </form>

      {result && (
        <div className="grid gap-4 lg:grid-cols-3">
          {result.variants.map((variant) => (
            <section key={variant.label} className="space-y-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold">Version {variant.label}</h2>
                <Button type="button" size="sm" variant="outline" onClick={() => downloadVariant(variant)}>
                  <Download size={15} /> Télécharger
                </Button>
              </div>
              {variant.questions.map((question, index) => (
                <div key={index} className="space-y-1">
                  <Label htmlFor={`${variant.label}-${index}`}>Question {index + 1} · {question.points} points</Label>
                  <textarea
                    id={`${variant.label}-${index}`}
                    value={question.prompt}
                    onChange={(event) => updateQuestion(variant.label, index, event.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
