'use client'

import { useActionState, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  FileText,
  Type,
  UploadCloud,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createDocumentAction,
  deleteDocumentAction,
  type DocumentActionState,
} from '@/features/documents/server/document.actions'
import type { SourceDocument } from '@/features/documents/types/document.types'

const BRAND = '#534AB7'
const MAX_CONTENT_LENGTH = 20000
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 Mo

const initialActionState: DocumentActionState = { error: null }

interface DocumentsManagerProps {
  initialDocuments: SourceDocument[]
}

export default function DocumentsManager({ initialDocuments }: DocumentsManagerProps) {
  const [mode, setMode] = useState<'text' | 'file'>('text')
  const [contentText, setContentText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState(
    async (prevState: DocumentActionState, formData: FormData) => {
      const result = await createDocumentAction(prevState, formData)
      if (!result.error) {
        setContentText('')
        setFileName(null)
        setFileError(null)
        formRef.current?.reset()
      }
      return result
    },
    initialActionState
  )

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setFileError(null)
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
      setFileError(
        'Seuls les fichiers .txt sont acceptés pour l’instant — l’import PDF arrive dans une prochaine version.'
      )
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('Fichier trop volumineux (2 Mo maximum).')
      return
    }

    setIsReadingFile(true)
    try {
      const text = await file.text()
      setContentText(text.slice(0, MAX_CONTENT_LENGTH))
      setFileName(file.name)
    } catch {
      setFileError('Impossible de lire ce fichier.')
    } finally {
      setIsReadingFile(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="h-11 w-11 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${BRAND}20` }}
        >
          <FileText size={22} style={{ color: BRAND }} />
        </div>
        <div>
          <h1 className="text-2xl font-black">Documents source</h1>
          <p className="text-sm text-muted-foreground">
            Le point de départ de vos déclinaisons pédagogiques
          </p>
        </div>
      </div>

      {/* Formulaire d'ajout */}
      <form
        ref={formRef}
        action={formAction}
        className="rounded-2xl border border-border bg-card/40 p-6 space-y-4"
      >
        <input type="hidden" name="sourceType" value={mode} />
        <input type="hidden" name="originalFilename" value={fileName ?? ''} />

        <div className="space-y-2">
          <Label htmlFor="title">Titre</Label>
          <Input
            id="title"
            name="title"
            placeholder="Ex : Chapitre 4 — Les fractions"
            required
            className="bg-muted/40"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              mode === 'text'
                ? 'text-white border-transparent'
                : 'border-border text-muted-foreground hover:bg-muted/40'
            }`}
            style={mode === 'text' ? { backgroundColor: BRAND } : {}}
          >
            <Type size={14} /> Texte direct
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              mode === 'file'
                ? 'text-white border-transparent'
                : 'border-border text-muted-foreground hover:bg-muted/40'
            }`}
            style={mode === 'file' ? { backgroundColor: BRAND } : {}}
          >
            <UploadCloud size={14} /> Fichier .txt
          </button>
        </div>

        {mode === 'file' && (
          <div className="space-y-2">
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={handleFileChange}
              className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm"
            />
            {isReadingFile && (
              <p className="text-xs text-muted-foreground">Lecture du fichier…</p>
            )}
            {fileError && (
              <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="contentText">
            Contenu {mode === 'file' && fileName ? `— importé depuis ${fileName}` : ''}
          </Label>
          <textarea
            id="contentText"
            name="contentText"
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            placeholder={
              mode === 'text'
                ? 'Collez ou rédigez le texte de votre document…'
                : 'Le contenu importé apparaîtra ici, modifiable si besoin'
            }
            maxLength={MAX_CONTENT_LENGTH}
            required
            className="min-h-40 w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-right text-xs text-muted-foreground">
            {contentText.length}/{MAX_CONTENT_LENGTH}
          </p>
        </div>

        {state.error && (
          <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending || isReadingFile}
          className="w-full text-white"
          style={{ backgroundColor: BRAND }}
        >
          {isPending ? 'Enregistrement…' : 'Ajouter le document'}
        </Button>
      </form>

      {/* Liste */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {initialDocuments.length === 0
            ? 'Aucun document pour l’instant'
            : `${initialDocuments.length} document${initialDocuments.length > 1 ? 's' : ''}`}
        </h2>

        {initialDocuments.map((doc) => {
          const isExpanded = expandedId === doc.id
          return (
            <div key={doc.id} className="rounded-2xl border border-border bg-card/40 p-4 space-y-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                >
                  {isExpanded ? (
                    <ChevronUp size={14} className="shrink-0" />
                  ) : (
                    <ChevronDown size={14} className="shrink-0" />
                  )}
                  <span className="font-semibold text-sm truncate">{doc.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {doc.source_type === 'file' ? doc.original_filename : 'Texte direct'}
                  </span>
                </button>
                <form action={deleteDocumentAction.bind(null, doc.id)}>
                  <DeleteButton />
                </form>
              </div>
              {isExpanded && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap border-t border-border pt-2">
                  {doc.content_text}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DeleteButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="p-2 rounded-lg border border-border text-muted-foreground hover:text-rose-400 hover:border-rose-500/30 transition-colors disabled:opacity-50 shrink-0"
      aria-label="Supprimer"
    >
      <Trash2 size={14} />
    </button>
  )
}
