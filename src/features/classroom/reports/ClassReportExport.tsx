'use client'

import { useMemo, useState } from 'react'
import { Download, FileDown, FileText, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/shared/ToastProvider'
import type { ClassroomPeriod } from '@/features/classroom/types/classroomDashboard.types'
import type { ExportFormat } from '@/features/export/types/export.types'

interface ClassReportExportProps {
  classId: string
  initialPeriod: ClassroomPeriod
}

type ReportKind = 'summary' | 'register'
type RegisterPeriod = ClassroomPeriod | 'school-year' | 'custom'

const PERIODS: Array<{ value: RegisterPeriod; label: string }> = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
  { value: 'school-year', label: 'Année scolaire' },
  { value: 'custom', label: 'Dates personnalisées' },
]

function isoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function resolveRegisterRange(period: RegisterPeriod, customFrom: string, customTo: string) {
  const today = new Date()
  if (period === 'custom') return { from: customFrom, to: customTo }
  if (period === 'school-year') {
    const startYear = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1
    return { from: `${startYear}-08-01`, to: `${startYear + 1}-07-31` }
  }
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const from = new Date(today)
  from.setDate(today.getDate() - (days - 1))
  return { from: isoDate(from), to: isoDate(today) }
}

export default function ClassReportExport({ classId, initialPeriod }: ClassReportExportProps) {
  const { showToast } = useToast()
  const today = useMemo(() => isoDate(new Date()), [])
  const [isOpen, setIsOpen] = useState(false)
  const [kind, setKind] = useState<ReportKind>('register')
  const [period, setPeriod] = useState<RegisterPeriod>(initialPeriod)
  const [customFrom, setCustomFrom] = useState(today)
  const [customTo, setCustomTo] = useState(today)
  const [includeNames, setIncludeNames] = useState(true)
  const [includeObservations, setIncludeObservations] = useState(true)
  const [pendingFormat, setPendingFormat] = useState<ExportFormat | null>(null)

  async function downloadReport(format: ExportFormat) {
    const range = resolveRegisterRange(period, customFrom, customTo)
    if (kind === 'register' && (!range.from || !range.to || range.from > range.to)) {
      showToast('Vérifiez les dates du registre.', 'error')
      return
    }

    setPendingFormat(format)
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          kind === 'register'
            ? {
                source: 'attendance_register',
                sourceId: classId,
                format,
                from: range.from,
                to: range.to,
                includeNames,
              }
            : {
                source: 'classroom',
                sourceId: classId,
                format,
                period: period === '7d' || period === '90d' ? period : '30d',
                includeNames,
                includeObservations,
              }
        ),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? 'Impossible de générer ce rapport.')
      }

      const blob = await response.blob()
      const disposition = response.headers.get('Content-Disposition') ?? ''
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `rapport-classe.${format}`
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = filename
      window.document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      showToast(`${kind === 'register' ? 'Registre' : 'Rapport'} ${format.toUpperCase()} généré.`, 'success')
    } catch (error) {
      console.error('[classroom:report] téléchargement impossible', error)
      showToast(error instanceof Error ? error.message : 'Impossible de générer ce rapport.', 'error')
    } finally {
      setPendingFormat(null)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" className="min-h-10" onClick={() => setIsOpen(true)}>
        <FileDown /> Exporter les présences
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center sm:p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="class-report-title"
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-border bg-card p-5 shadow-xl sm:max-w-xl sm:rounded-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="class-report-title" className="text-lg font-black">Exporter les données de classe</h2>
                <p className="text-sm text-muted-foreground">Choisissez une synthèse ou le registre détaillé.</p>
              </div>
              <Button type="button" size="icon" variant="ghost" aria-label="Fermer" onClick={() => setIsOpen(false)}>
                <X />
              </Button>
            </div>

            <div className="mt-5 space-y-5">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setKind('register')} className={`min-h-11 rounded-md border px-3 text-sm font-semibold ${kind === 'register' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
                  Registre détaillé
                </button>
                <button type="button" onClick={() => { setKind('summary'); if (period === 'school-year' || period === 'custom') setPeriod('30d') }} className={`min-h-11 rounded-md border px-3 text-sm font-semibold ${kind === 'summary' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
                  Rapport de synthèse
                </button>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Période</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PERIODS.filter((item) => kind === 'register' || ['7d', '30d', '90d'].includes(item.value)).map((item) => (
                    <button key={item.value} type="button" onClick={() => setPeriod(item.value)} className={`min-h-10 rounded-md border px-3 text-sm font-semibold ${period === item.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/40'}`}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {kind === 'register' && period === 'custom' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold">Du
                    <input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="mt-1 min-h-10 w-full rounded-md border border-border bg-background px-3" />
                  </label>
                  <label className="text-sm font-semibold">Au
                    <input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="mt-1 min-h-10 w-full rounded-md border border-border bg-background px-3" />
                  </label>
                </div>
              )}

              <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                <span><strong className="block text-sm">Afficher les noms</strong><small className="text-muted-foreground">Désactivez pour anonymiser le document.</small></span>
                <input type="checkbox" checked={includeNames} onChange={(event) => setIncludeNames(event.target.checked)} className="h-5 w-5 accent-primary" />
              </label>

              {kind === 'summary' && (
                <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                  <span><strong className="block text-sm">Inclure les observations</strong><small className="text-muted-foreground">Ajoute les faits récents enregistrés.</small></span>
                  <input type="checkbox" checked={includeObservations} onChange={(event) => setIncludeObservations(event.target.checked)} className="h-5 w-5 accent-primary" />
                </label>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" className="min-h-11" disabled={pendingFormat !== null} onClick={() => void downloadReport('pdf')}>
                  {pendingFormat === 'pdf' ? <Loader2 className="animate-spin" /> : <FileText />} Télécharger PDF
                </Button>
                <Button type="button" className="min-h-11" disabled={pendingFormat !== null} onClick={() => void downloadReport('docx')}>
                  {pendingFormat === 'docx' ? <Loader2 className="animate-spin" /> : <Download />} Télécharger DOCX
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
