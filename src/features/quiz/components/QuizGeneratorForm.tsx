'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, ClipboardList, FileText, Sparkles, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/shared/ToastProvider'
import { extractDocumentTextAction } from '@/features/documents/server/document.actions'
import { generateQuizAction, type GenerateQuizState } from '@/features/quiz/server/quiz.actions'
import type { SourceDocumentListItem } from '@/features/documents/types/document.types'

const BRAND = '#534AB7'
const initialState: GenerateQuizState = { error: null, quizId: null }
const MAX_CONTENT_LENGTH = 20000
const MAX_TEXT_FILE_SIZE = 8 * 1024 * 1024
const MAX_PDF_FILE_SIZE = 8 * 1024 * 1024
const MAX_DOCX_FILE_SIZE = 8 * 1024 * 1024

interface QuizGeneratorFormProps {
  documents: SourceDocumentListItem[]
  defaultSourceDocumentId?: string
  subjects: string[]
}

export default function QuizGeneratorForm({ documents, defaultSourceDocumentId, subjects }: QuizGeneratorFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [mode, setMode] = useState<'document' | 'text'>(defaultSourceDocumentId ? 'document' : 'text')
  const [selectedDocumentId, setSelectedDocumentId] = useState(defaultSourceDocumentId ?? '')
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] ?? '')
  const [pastedText, setPastedText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [fileWarning, setFileWarning] = useState<string | null>(null)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [questionCount, setQuestionCount] = useState('5')
  const [state, formAction, isPending] = useActionState(generateQuizAction, initialState)

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId),
    [documents, selectedDocumentId]
  )

  useEffect(() => {
    if (state.error) {
      showToast(state.error, 'error')
    }
  }, [showToast, state.error])

  useEffect(() => {
    if (!state.quizId) return
    showToast('QCM généré et enregistré.', 'success')
    router.push('/quiz')
    router.refresh()
  }, [router, showToast, state.quizId])

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setFileError(null)
    setFileWarning(null)
    if (!file) return

    const isTxt = file.name.toLowerCase().endsWith('.txt') || file.type === 'text/plain'
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
    const isDocx =
      file.name.toLowerCase().endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    function failWith(message: string) {
      setFileError(message)
      setFileName(null)
      showToast(message, 'error')
    }

    if (file.name.toLowerCase().endsWith('.doc')) {
      failWith('Les anciens fichiers .doc ne sont pas pris en charge. Exportez en .docx.')
      return
    }

    if (!isTxt && !isPdf && !isDocx) {
      failWith('Seuls les fichiers .txt, .pdf et .docx sont acceptés.')
      return
    }

    if (isTxt && file.size > MAX_TEXT_FILE_SIZE) {
      failWith('Fichier trop volumineux (8 Mo maximum).')
      return
    }

    if (isPdf && file.size > MAX_PDF_FILE_SIZE) {
      failWith('PDF trop volumineux (8 Mo maximum).')
      return
    }

    if (isDocx && file.size > MAX_DOCX_FILE_SIZE) {
      failWith('DOCX trop volumineux (8 Mo maximum).')
      return
    }

    if (isTxt) {
      setIsReadingFile(true)
      try {
        const text = await file.text()
        if (text.length > MAX_CONTENT_LENGTH) {
          const warning = 'Le document a été limité à 20 000 caractères. Relisez le contenu avant de générer.'
          setFileWarning(warning)
          showToast(warning, 'error')
        }
        setPastedText(text.trim().slice(0, MAX_CONTENT_LENGTH))
        setFileName(file.name)
      } catch {
        failWith('Impossible de lire ce fichier.')
      } finally {
        setIsReadingFile(false)
      }
      return
    }

    setIsReadingFile(true)
    try {
      const result = await extractDocumentTextAction(file)
      if (result.error || !result.text) {
        failWith(result.error ?? 'Impossible d’extraire le texte de ce fichier.')
        return
      }
      setPastedText(result.text)
      setFileName(file.name)
      setFileWarning(result.warning)
      if (result.warning) showToast(result.warning, 'error')
    } catch {
      failWith('Impossible de lire ce fichier.')
    } finally {
      setIsReadingFile(false)
    }
  }

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-card/40 p-3 sm:space-y-5 sm:rounded-2xl sm:p-5">
      <input type="hidden" name="questionCount" value={questionCount} />
      <input type="hidden" name="sourceDocumentId" value={mode === 'document' ? selectedDocumentId : ''} />

      <div className="space-y-2">
        <Label htmlFor="subject">Matière</Label>
        {subjects.length > 0 ? (
          <select
            id="subject"
            name="subject"
            value={selectedSubject}
            onChange={(event) => setSelectedSubject(event.target.value)}
            className="min-h-10 w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            required
          >
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        ) : (
          <Input
            id="subject"
            name="subject"
            value={selectedSubject}
            onChange={(event) => setSelectedSubject(event.target.value)}
            placeholder="Ex : Mathématiques"
            className="bg-muted/40"
            required
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode('document')}
          className={`flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
            mode === 'document'
              ? 'border-transparent text-white'
              : 'border-border text-muted-foreground hover:bg-muted/40'
          }`}
          style={mode === 'document' ? { backgroundColor: BRAND } : undefined}
        >
          <FileText size={15} /> Document
        </button>
        <button
          type="button"
          onClick={() => setMode('text')}
          className={`flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
            mode === 'text'
              ? 'border-transparent text-white'
              : 'border-border text-muted-foreground hover:bg-muted/40'
          }`}
          style={mode === 'text' ? { backgroundColor: BRAND } : undefined}
        >
          <UploadCloud size={15} /> Déposer / coller
        </button>
      </div>

      {mode === 'document' ? (
        <div className="space-y-3">
          <Label>Document source</Label>
          {documents.length === 0 ? (
            <div className="space-y-3 rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              <p>Aucun document source disponible.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setMode('text')} className="w-full sm:w-auto">
                <UploadCloud size={14} /> Déposer ou coller un cours
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((document) => {
                const selected = selectedDocumentId === document.id
                return (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => setSelectedDocumentId(document.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                      selected ? 'border-primary/60 bg-primary/10' : 'border-border bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {selected ? (
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: BRAND }} />
                      ) : (
                        <FileText size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{document.title}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {document.source_type === 'file'
                            ? `${document.file_type?.toUpperCase() ?? 'FICHIER'} · ${document.original_filename ?? 'fichier'}`
                            : 'Texte direct'}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="courseFile">Fichier de cours</Label>
            <input
              id="courseFile"
              type="file"
              accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="w-full min-w-0 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Déposez un fichier .txt, .pdf textuel ou .docx. Le texte extrait reste modifiable avant génération.
            </p>
            {isReadingFile && <p className="text-xs text-muted-foreground">Lecture du fichier…</p>}
            {fileName && !isReadingFile && (
              <Badge variant="outline" className="h-auto max-w-full whitespace-normal rounded-lg py-1 text-muted-foreground">
                Fichier chargé : {fileName}
              </Badge>
            )}
            {fileError && (
              <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
            {fileWarning && (
              <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-200">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{fileWarning}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pastedText">Contenu de cours</Label>
            <textarea
              id="pastedText"
              name="pastedText"
              value={pastedText}
              onChange={(event) => setPastedText(event.target.value)}
              maxLength={20000}
              placeholder="Collez ici le contenu du cours à transformer en quiz, ou chargez un fichier ci-dessus."
              className="min-h-44 w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-right text-xs text-muted-foreground">{pastedText.length}/20000</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="questionCount">Nombre de questions</Label>
        <Input
          id="questionCount"
          type="number"
          min={5}
          max={10}
          value={questionCount}
          onChange={(event) => setQuestionCount(event.target.value)}
          className="bg-muted/40"
        />
      </div>

      {selectedDocument && mode === 'document' && (
        <Badge variant="outline" className="h-auto max-w-full whitespace-normal rounded-lg py-1 text-muted-foreground">
          Source sélectionnée : {selectedDocument.title}
        </Badge>
      )}

      {state.error && (
        <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending || isReadingFile || (mode === 'document' && !selectedDocumentId)}
        className="min-h-11 w-full whitespace-normal text-white"
        style={{ backgroundColor: BRAND }}
      >
        {isPending ? (
          <>
            <Sparkles size={16} className="animate-spin" /> Génération…
          </>
        ) : (
          <>
            <ClipboardList size={16} /> Générer le quiz
          </>
        )}
      </Button>
    </form>
  )
}
