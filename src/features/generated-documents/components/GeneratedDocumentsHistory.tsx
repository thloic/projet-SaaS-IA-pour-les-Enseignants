'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Copy, Download, FileText, Loader2, Mail, MessageSquare, Search, Users } from 'lucide-react'
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
    back: 'Retour à l’historique', title: 'Documents générés', subtitle: 'PAT, bulletins, courriels parents et comptes-rendus conservés automatiquement.',
    allClasses: 'Toutes les classes', studentSearch: 'Rechercher un élève dans cette classe…', allTypes: 'Tous les types', pat: 'PAT', bulletin: 'Bulletins', parentEmail: 'Courriels parents', meetingSummary: 'Comptes-rendus', empty: 'Aucun document ne correspond à ces filtres.', noClass: 'Sans classe',
    failed: 'Impossible de charger les documents pour le moment.', export: 'Exporter DOCX', copy: 'Copier', copied: 'Copié !', exportFailed: 'L’export du PAT a échoué.', exported: 'PAT exporté.',
    sentOn: 'Envoyé le', draft: 'Brouillon', subjectsDiscussed: 'Sujets abordés', agreementsReached: 'Ententes', nextSteps: 'Prochaines étapes',
    registers: { comportement: 'Comportement', echec: 'Échec', plagiat: 'Plagiat', autre: 'Autre' },
  },
  en: {
    back: 'Back to history', title: 'Generated documents', subtitle: 'Support plans, reports, parent emails and meeting summaries saved automatically.',
    allClasses: 'All classes', studentSearch: 'Search for a student in this class…', allTypes: 'All types', pat: 'Support plans', bulletin: 'Reports', parentEmail: 'Parent emails', meetingSummary: 'Meeting summaries', empty: 'No document matches these filters.', noClass: 'No class',
    failed: 'Documents cannot be loaded right now.', export: 'Export DOCX', copy: 'Copy', copied: 'Copied!', exportFailed: 'The support plan export failed.', exported: 'Support plan exported.',
    sentOn: 'Sent on', draft: 'Draft', subjectsDiscussed: 'Topics discussed', agreementsReached: 'Agreements', nextSteps: 'Next steps',
    registers: { comportement: 'Behavior', echec: 'Failing grade', plagiat: 'Plagiarism', autre: 'Other' },
  },
  es: {
    back: 'Volver al historial', title: 'Documentos generados', subtitle: 'PAT, boletines, correos a padres y resúmenes de reunión guardados automáticamente.',
    allClasses: 'Todas las clases', studentSearch: 'Buscar un alumno en esta clase…', allTypes: 'Todos los tipos', pat: 'PAT', bulletin: 'Boletines', parentEmail: 'Correos a padres', meetingSummary: 'Resúmenes de reunión', empty: 'Ningún documento coincide con estos filtros.', noClass: 'Sin clase',
    failed: 'No se pueden cargar los documentos ahora.', export: 'Exportar DOCX', copy: 'Copiar', copied: '¡Copiado!', exportFailed: 'La exportación del PAT ha fallado.', exported: 'PAT exportado.',
    sentOn: 'Enviado el', draft: 'Borrador', subjectsDiscussed: 'Temas tratados', agreementsReached: 'Acuerdos', nextSteps: 'Próximos pasos',
    registers: { comportement: 'Comportamiento', echec: 'Fracaso', plagiat: 'Plagio', autre: 'Otro' },
  },
} as const

export default function GeneratedDocumentsHistory({ documents, classes, loadFailed = false }: GeneratedDocumentsHistoryProps) {
  const { locale } = useAppLocale()
  const { showToast } = useToast()
  const copy = COPY_TEXT[locale]
  const [classId, setClassId] = useState('all')
  const [studentQuery, setStudentQuery] = useState('')
  const [type, setType] = useState<'all' | 'pat' | 'bulletin' | 'parent-email' | 'meeting-summary'>('all')
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

  async function copyText(id: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  function meetingSummaryText(document: Extract<GeneratedDocumentHistoryItem, { documentType: 'meeting-summary' }>) {
    const sections = [
      document.notes,
      document.subjectsDiscussed.length ? `${copy.subjectsDiscussed}:\n${document.subjectsDiscussed.map((item) => `- ${item}`).join('\n')}` : null,
      document.agreementsReached.length ? `${copy.agreementsReached}:\n${document.agreementsReached.map((item) => `- ${item}`).join('\n')}` : null,
      document.nextSteps.length ? `${copy.nextSteps}:\n${document.nextSteps.map((item) => `- ${item}`).join('\n')}` : null,
    ]
    return sections.filter(Boolean).join('\n\n')
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
          <option value="all">{copy.allTypes}</option><option value="pat">{copy.pat}</option><option value="bulletin">{copy.bulletin}</option><option value="parent-email">{copy.parentEmail}</option><option value="meeting-summary">{copy.meetingSummary}</option>
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
                    {document.documentType === 'pat' ? <FileText /> : document.documentType === 'bulletin' ? <MessageSquare /> : document.documentType === 'parent-email' ? <Mail /> : <Users />}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-bold">{document.studentName}</h2>
                    <p className="text-xs text-muted-foreground">
                      {classNames.get(document.classId ?? '') ?? copy.noClass} ·{' '}
                      {document.documentType === 'pat'
                        ? copy.pat
                        : document.documentType === 'bulletin'
                          ? `${copy.bulletin} · ${document.subject} · ${document.grade}`
                          : document.documentType === 'parent-email'
                            ? `${copy.parentEmail} · ${copy.registers[document.register]}`
                            : copy.meetingSummary}{' '}
                      · {new Date(document.createdAt).toLocaleString(locale)}
                    </p>
                  </div>
                </div>
                {document.documentType === 'pat' ? (
                  <Button type="button" size="sm" onClick={() => void exportPAT(document)} disabled={exportingId === document.id}>
                    {exportingId === document.id ? <Loader2 className="animate-spin" /> : <Download />} {copy.export}
                  </Button>
                ) : document.documentType === 'bulletin' ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => void copyText(document.id, document.comment)}>
                    {copiedId === document.id ? <Check /> : <Copy />} {copiedId === document.id ? copy.copied : copy.copy}
                  </Button>
                ) : document.documentType === 'parent-email' ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => void copyText(document.id, `${document.subject}\n\n${document.body}`)}>
                    {copiedId === document.id ? <Check /> : <Copy />} {copiedId === document.id ? copy.copied : copy.copy}
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" onClick={() => void copyText(document.id, meetingSummaryText(document))}>
                    {copiedId === document.id ? <Check /> : <Copy />} {copiedId === document.id ? copy.copied : copy.copy}
                  </Button>
                )}
              </div>
              {document.documentType === 'bulletin' && <p className="mt-4 text-sm leading-relaxed">{document.comment}</p>}
              {document.documentType === 'parent-email' && (
                <div className="mt-4 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {document.sentAt ? `${copy.sentOn} ${new Date(document.sentAt).toLocaleString(locale)}${document.sentTo ? ` · ${document.sentTo}` : ''}` : copy.draft}
                  </p>
                  <p className="text-sm font-semibold">{document.subject}</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{document.body}</p>
                </div>
              )}
              {document.documentType === 'meeting-summary' && (
                <div className="mt-4 space-y-2 text-sm leading-relaxed">
                  <p className="whitespace-pre-wrap">{document.notes}</p>
                  {document.subjectsDiscussed.length > 0 && (
                    <p><span className="font-semibold">{copy.subjectsDiscussed} :</span> {document.subjectsDiscussed.join(', ')}</p>
                  )}
                  {document.agreementsReached.length > 0 && (
                    <p><span className="font-semibold">{copy.agreementsReached} :</span> {document.agreementsReached.join(', ')}</p>
                  )}
                  {document.nextSteps.length > 0 && (
                    <p><span className="font-semibold">{copy.nextSteps} :</span> {document.nextSteps.join(', ')}</p>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
