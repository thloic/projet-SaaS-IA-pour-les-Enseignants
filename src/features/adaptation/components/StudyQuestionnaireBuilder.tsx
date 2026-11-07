'use client'

import { useState } from 'react'
import { Download, Eye, EyeOff, FileText, Loader2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/shared/ToastProvider'
import { extractDocumentTextAction } from '@/features/documents/server/document.actions'
import {
  studyQuestionnaireSchema,
  type StudyQuestionnaire,
} from '@/features/adaptation/schemas/studyQuestionnaireSchema'
import {
  formatStudyQuestionnaireText,
  studyQuestionTypeLabel,
} from '@/features/adaptation/utils/studyQuestionnaireText'

interface Props {
  defaultSubject: string
  defaultLevel: string
}

function downloadText(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function StudyQuestionnaireBuilder({ defaultSubject, defaultLevel }: Props) {
  const { showToast } = useToast()
  const [sourceTitle, setSourceTitle] = useState('')
  const [subject, setSubject] = useState(defaultSubject)
  const [level, setLevel] = useState(defaultLevel)
  const [sourceContent, setSourceContent] = useState('')
  const [result, setResult] = useState<StudyQuestionnaire | null>(null)
  const [showAnswers, setShowAnswers] = useState(false)
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
      setError(caught instanceof Error ? caught.message : 'Impossible de lire le fichier.')
    } finally {
      setIsReading(false)
    }
  }

  async function generate(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setResult(null)
    setShowAnswers(false)
    setIsGenerating(true)
    try {
      const response = await fetch('/api/adaptations/study-questionnaire', {
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
      setResult(studyQuestionnaireSchema.parse(payload))
      showToast('Le questionnaire est prêt.', 'success')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'La génération a échoué.')
    } finally {
      setIsGenerating(false)
    }
  }

  const baseName = result ? result.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() : 'questionnaire'

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <header>
        <h1 className="text-2xl font-black">Questionnaire d’étude</h1>
        <p className="text-sm text-muted-foreground">
          Transformez un texte en questionnaire avec corrigé. Rien n’est enregistré : téléchargez le résultat.
        </p>
      </header>

      <form onSubmit={generate} className="space-y-5 rounded-xl border border-border bg-card/50 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="quiz-title">Titre du questionnaire</Label>
            <Input id="quiz-title" value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="quiz-subject">Matière</Label>
            <Input id="quiz-subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quiz-level">Niveau</Label>
            <Input id="quiz-level" value={level} onChange={(event) => setLevel(event.target.value)} />
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-border p-5 hover:bg-muted/30">
          {isReading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
          <span>{isReading ? 'Lecture...' : 'Importer un PDF, DOCX ou TXT'}</span>
          <input type="file" accept=".pdf,.docx,.txt" className="sr-only" onChange={(event) => void readFile(event.target.files?.[0])} />
        </label>

        <div className="space-y-2">
          <Label htmlFor="quiz-content">Texte source</Label>
          <textarea
            id="quiz-content"
            value={sourceContent}
            onChange={(event) => setSourceContent(event.target.value.slice(0, 30000))}
            rows={12}
            placeholder="Collez le texte à transformer en questionnaire..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={isGenerating || isReading}>
          {isGenerating ? <Loader2 className="animate-spin" /> : <FileText />}
          Générer le questionnaire
        </Button>
      </form>

      {result && (
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">{result.title}</h2>
              <p className="text-xs text-muted-foreground">
                À relire avant de le distribuer : le questionnaire est généré par IA.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setShowAnswers((value) => !value)}>
                {showAnswers ? <EyeOff size={15} /> : <Eye size={15} />}
                {showAnswers ? 'Masquer le corrigé' : 'Afficher le corrigé'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => downloadText(formatStudyQuestionnaireText(result, { withAnswers: false }), `${baseName}.txt`)}
              >
                <Download size={15} /> Élèves
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => downloadText(formatStudyQuestionnaireText(result, { withAnswers: true }), `${baseName}-corrige.txt`)}
              >
                <Download size={15} /> Avec corrigé
              </Button>
            </div>
          </div>

          <ol className="space-y-4">
            {result.questions.map((question, index) => (
              <li key={index} className="space-y-1 border-t border-border pt-3 first:border-t-0 first:pt-0">
                <p className="text-xs font-medium text-muted-foreground">
                  Question {index + 1} · {studyQuestionTypeLabel(question.type)}
                </p>
                <p className="text-sm font-semibold">{question.prompt}</p>
                {question.choices && (
                  <ul className="ml-4 list-[upper-alpha] text-sm">
                    {question.choices.map((choice) => (
                      <li key={choice} className={showAnswers && choice === question.answer ? 'font-semibold text-primary' : ''}>
                        {choice}
                      </li>
                    ))}
                  </ul>
                )}
                {showAnswers && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Réponse :</span> {question.answer}
                    {question.explanation ? ` — ${question.explanation}` : ''}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
