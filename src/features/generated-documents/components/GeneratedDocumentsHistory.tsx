'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Copy, Download, FileText, Loader2, MessageSquare, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/shared/ToastProvider'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import type { GeneratedDocumentHistoryItem } from '@/features/generated-documents/types/generatedDocument.types'

interface GeneratedDocumentsHistoryProps {
  documents: GeneratedDocumentHistoryItem[]
  classes: Array<{ id: string; name: string }>
  loadFailed?: boolean
}

const COPY_TEXT = {
  fr: {
    back: 'Retour à l’historique', title: 'Documents générés', subtitle: 'PAT et commentaires de bulletin conservés automatiquement.',
    allClasses: 'Toutes les classes', studentSearch: 'Rechercher un élève dans cette classe…', allTypes: 'Tous les types', pat: 'PAT', bulletin: 'Bulletins', empty: 'Aucun document ne correspond à ces filtres.', noClass: 'Sans classe',
    failed: 'Impossible de charger les documents pour le moment.', export: 'Exporter DOCX', copy: 'Copier', copied: 'Copié !', exportFailed: 'L’export du PAT a échoué.', exported: 'PAT exporté.',
  },
  en: {
    back: 'Back to history', title: 'Generated documents', subtitle: 'Support plans and report card comments saved automatically.',
    allClasses: 'All classes', studentSearch: 'Search for a student in this class…', allTypes: 'All types', pat: 'Support plans', bulletin: 'Reports', empty: 'No document matches these filters.', noClass: 'No class',
    failed: 'Documents cannot be loaded right now.', export: 'Export DOCX', copy: 'Copy', copied: 'Copied!', exportFailed: 'The support plan export failed.', exported: 'Support plan exported.',
  },
  es: {
    back: 'Volver al historial', title: 'Documentos generados', subtitle: 'PAT y comentarios de boletín guardados automáticamente.',
    allClasses: 'Todas las clases', studentSearch: 'Buscar un alumno en esta clase…', allTypes: 'Todos los tipos', pat: 'PAT', bulletin: 'Boletines', empty: 'Ningún documento coincide con estos filtros.', noClass: 'Sin clase',
    failed: 'No se pueden cargar los documentos ahora.', export: 'Exportar DOCX', copy: 'Copiar', copied: '¡Copiado!', exportFailed: 'La exportación del PAT ha fallado.', exported: 'PAT exportado.',
  },
} as const

export default function GeneratedDocumentsHistory({ documents, classes, loadFailed = false }: GeneratedDocumentsHistoryProps) {
  const { locale } = useAppLocale()
  const { showToast } = useToast()
  const copy = COPY_TEXT[locale]
  const [classId, setClassId] = useState('all')
  const [studentQuery, setStudentQuery] = useState('')
  const [type, setType] = useState<'all' | 'pat' | 'bulletin'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)

  const classNames = useMemo(() => new Map(classes.map((classroom) => [classroom.id, classroom.name])), [classes])
  const students = useMemo(() => {
    const names = new Set(
      documents
        .filter((document) => classId === 'all' || document.classId === classId)
        .map((document) => document.studentName)
    )
    return [...names].sort((a, b) => a.localeCompare(b, locale))
  }, [classId, documents, locale])
  const normalizedStudentQuery = studentQuery.trim().toLocaleLowerCase(locale)
  const filtered = documents.filter((document) => {
    const matchesClass = classId === 'all' || document.classId === classId
    const matchesStudent = !normalizedStudentQuery || document.studentName.toLocaleLowerCase(locale).includes(normalizedStudentQuery)
    const matchesType = type === 'all' || document.documentType === type
    return matchesClass && matchesStudent && matchesType
  })

  async function exportPAT(document: Extract<GeneratedDocumentHistoryItem, { documentType: 'pat' }>) {
    try {
      setExportingId(document.id)
      const response = await fetch('/api/agent/pat/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pat: document.pat, language: document.language }),
      })
      if (!response.ok) throw new Error('EXPORT_FAILED')
      const url = URL.createObjectURL(await response.blob())
      const link = window.document.createElement('a')
      link.href = url
      link.download = `pat-${document.studentName.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}.docx`
      link.click()
      URL.revokeObjectURL(url)
      showToast(copy.exported, 'success')
    } catch {
      showToast(copy.exportFailed, 'error')
    } finally {
      setExportingId(null)
    }
  }

  async function copyBulletin(document: Extract<GeneratedDocumentHistoryItem, { documentType: 'bulletin' }>) {
    await navigator.clipboard.writeText(document.comment)
    setCopiedId(document.id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24 lg:pb-8">
      <header>
        <Button asChild variant="ghost" className="-ml-2 mb-2"><Link href="/history"><ArrowLeft /> {copy.back}</Link></Button>
        <h1 className="text-2xl font-black sm:text-3xl">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </header>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-3">
        <select
          value={classId}
          onChange={(event) => { setClassId(event.target.value); setStudentQuery('') }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          aria-label={copy.allClasses}
        >
          <option value="all">{copy.allClasses}</option>
          {classes.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
        </select>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={studentQuery}
            onChange={(event) => setStudentQuery(event.target.value)}
            placeholder={copy.studentSearch}
            list="generated-document-students"
            className="pl-9"
          />
          <datalist id="generated-document-students">
            {students.map((name) => <option key={name} value={name} />)}
          </datalist>
        </div>
        <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" aria-label={copy.allTypes}>
          <option value="all">{copy.allTypes}</option><option value="pat">{copy.pat}</option><option value="bulletin">{copy.bulletin}</option>
        </select>
      </div>

      {loadFailed ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{copy.failed}</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((document) => (
            <article key={`${document.documentType}:${document.id}`} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {document.documentType === 'pat' ? <FileText /> : <MessageSquare />}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-bold">{document.studentName}</h2>
                    <p className="text-xs text-muted-foreground">
                      {classNames.get(document.classId ?? '') ?? copy.noClass} · {document.documentType === 'pat' ? copy.pat : `${copy.bulletin} · ${document.subject} · ${document.grade}`} · {new Date(document.createdAt).toLocaleString(locale)}
                    </p>
                  </div>
                </div>
                {document.documentType === 'pat' ? (
                  <Button type="button" size="sm" onClick={() => void exportPAT(document)} disabled={exportingId === document.id}>
                    {exportingId === document.id ? <Loader2 className="animate-spin" /> : <Download />} {copy.export}
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" onClick={() => void copyBulletin(document)}>
                    {copiedId === document.id ? <Check /> : <Copy />} {copiedId === document.id ? copy.copied : copy.copy}
                  </Button>
                )}
              </div>
              {document.documentType === 'bulletin' && <p className="mt-4 text-sm leading-relaxed">{document.comment}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
