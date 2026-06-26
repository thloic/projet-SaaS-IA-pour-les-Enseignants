'use client'

import { startTransition, useActionState, useRef, useState } from 'react'
import {
  FileText,
  Type,
  UploadCloud,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createDocumentAction,
  deleteDocumentAction,
  extractDocumentTextAction,
  getDocumentContentAction,
  type DocumentActionState,
} from '@/features/documents/server/document.actions'
import { useToast } from '@/components/shared/ToastProvider'
import { useConfirm } from '@/components/shared/ConfirmProvider'
import type { DocumentFileType, SourceDocumentListItem } from '@/features/documents/types/document.types'

const BRAND = '#534AB7'
const MAX_CONTENT_LENGTH = 20000
const MAX_TEXT_FILE_SIZE = 2 * 1024 * 1024 // 2 Mo
const MAX_PDF_FILE_SIZE = 8 * 1024 * 1024 // 8 Mo
const MAX_DOCX_FILE_SIZE = 8 * 1024 * 1024 // 8 Mo

const initialActionState: DocumentActionState = { error: null }

interface DocumentsManagerProps {
  initialDocuments: SourceDocumentListItem[]
}

export default function DocumentsManager({ initialDocuments }: DocumentsManagerProps) {
  const { showToast } = useToast()
  const [mode, setMode] = useState<'text' | 'file'>('text')
  const [contentText, setContentText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileType, setFileType] = useState<DocumentFileType | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [fileWarning, setFileWarning] = useState<string | null>(null)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState(
    async (prevState: DocumentActionState, formData: FormData) => {
      try {
        const result = await createDocumentAction(prevState, formData)
        if (result.error) {
          showToast(result.error, 'error')
          return result
        }

        setContentText('')
        setFileName(null)
        setFileType(null)
        setFileError(null)
        setFileWarning(null)
        formRef.current?.reset()
        showToast('Document ajouté avec succès.', 'success')
        return result
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Une erreur inattendue est survenue. Veuillez réessayer.'
        showToast(message, 'error')
        return { error: message }
      }
    },
    initialActionState
  )

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
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
      setFileType(null)
      showToast(message, 'error')
    }

    if (file.name.toLowerCase().endsWith('.doc')) {
      failWith('Les anciens fichiers .doc ne sont pas pris en charge. Exportez en .docx.')
      return
    }

    if (!isTxt && !isPdf && !isDocx) {
      failWith('Seuls les fichiers .txt, .pdf et .docx sont acceptes.')
      return
    }

    if (isTxt && file.size > MAX_TEXT_FILE_SIZE) {
      failWith('Fichier trop volumineux (2 Mo maximum).')
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
          const warning = 'Le document a ete limite a 20 000 caracteres. Relisez le contenu avant de sauvegarder.'
          setFileWarning(warning)
          showToast(warning, 'error')
        }
        setContentText(text.trim().slice(0, MAX_CONTENT_LENGTH))
        setFileName(file.name)
        setFileType('txt')
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
        failWith(result.error ?? 'Impossible d extraire le texte de ce fichier.')
        return
      }
      setContentText(result.text)
      setFileName(file.name)
      setFileType(result.fileType)
      setFileWarning(result.warning)
      if (result.warning) showToast(result.warning, 'error')
    } catch {
      failWith('Impossible de lire ce fichier.')
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
        <input type="hidden" name="fileType" value={fileType ?? ''} />

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
            <UploadCloud size={14} /> Importer un fichier
          </button>
        </div>

        {mode === 'file' && (
          <div className="space-y-2">
            <input
              type="file"
              accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Fichiers .txt, .pdf textuel ou .docx. Les anciens .doc et PDF scannes ne sont pas pris en charge.
            </p>
            {isReadingFile && (
              <p className="text-xs text-muted-foreground">Lecture du fichier…</p>
            )}
            {fileError && (
              <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
            {fileWarning && (
              <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{fileWarning}</span>
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

        {initialDocuments.map((doc) => (
          <DocumentListItem
            key={doc.id}
            doc={doc}
            isExpanded={expandedId === doc.id}
            onToggleExpand={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface DocumentListItemProps {
  doc: SourceDocumentListItem
  isExpanded: boolean
  onToggleExpand: () => void
}

const initialDeleteState: DocumentActionState = { error: null }

function DocumentListItem({ doc, isExpanded, onToggleExpand }: DocumentListItemProps) {
  const { showToast } = useToast()
  const confirm = useConfirm()
  const [content, setContent] = useState<string | null>(null)
  const [isLoadingContent, setIsLoadingContent] = useState(false)

  async function handleToggleExpand() {
    onToggleExpand()
    if (content !== null || isLoadingContent) return

    setIsLoadingContent(true)
    try {
      const result = await getDocumentContentAction(doc.id)
      if (result.error) {
        showToast(result.error, 'error')
        return
      }
      setContent(result.content ?? '')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Impossible de charger le contenu de ce document.'
      showToast(message, 'error')
    } finally {
      setIsLoadingContent(false)
    }
  }

  const [, deleteAction, isDeleting] = useActionState(
    async () => {
      try {
        const result = await deleteDocumentAction(doc.id)
        if (result.error) {
          showToast(result.error, 'error')
        } else {
          showToast('Document supprimé.', 'success')
        }
        return result
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Une erreur inattendue est survenue. Veuillez réessayer.'
        showToast(message, 'error')
        return { error: message }
      }
    },
    initialDeleteState
  )

  async function handleDeleteClick() {
    const confirmed = await confirm({
      title: 'Supprimer ce document ?',
      message: `« ${doc.title} » sera définitivement supprimé. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
    })
    if (!confirmed) return
    startTransition(() => {
      deleteAction()
    })
  }

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4 space-y-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggleExpand}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          {isExpanded ? (
            <ChevronUp size={14} className="shrink-0" />
          ) : (
            <ChevronDown size={14} className="shrink-0" />
          )}
          <span className="font-semibold text-sm truncate">{doc.title}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {doc.source_type === 'file'
              ? `${doc.file_type?.toUpperCase() ?? 'FICHIER'} · ${doc.original_filename}`
              : 'Texte direct'}
          </span>
        </button>
        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="p-2 rounded-lg border border-border text-muted-foreground hover:text-rose-400 hover:border-rose-500/30 transition-colors disabled:opacity-50 shrink-0"
          aria-label="Supprimer"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {isExpanded && (
        <div className="text-sm text-muted-foreground whitespace-pre-wrap border-t border-border pt-2">
          {isLoadingContent ? 'Chargement du contenu…' : content}
        </div>
      )}
      <button
        type="button"
        disabled
        title="Disponible prochainement"
        className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground opacity-60 cursor-not-allowed"
      >
        <Sparkles size={14} /> Adapter en 5 versions — bientôt disponible
      </button>
    </div>
  )
}
