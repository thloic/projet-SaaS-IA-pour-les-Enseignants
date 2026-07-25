'use client'

import { useState } from 'react'
import { Download, FileDown, FileText, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/shared/ToastProvider'
import type {
  ClassroomPeriod,
} from '@/features/classroom/types/classroomDashboard.types'
import type { ExportFormat } from '@/features/export/types/export.types'

interface ClassReportExportProps {
  classId: string
  initialPeriod: ClassroomPeriod
}

const PERIODS: Array<{ value: ClassroomPeriod; label: string }> = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
]

export default function ClassReportExport({
  classId,
  initialPeriod,
}: ClassReportExportProps) {
  const { showToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [period, setPeriod] = useState<ClassroomPeriod>(initialPeriod)
  const [includeNames, setIncludeNames] = useState(true)
  const [includeObservations, setIncludeObservations] = useState(true)
  const [pendingFormat, setPendingFormat] = useState<ExportFormat | null>(null)

  async function downloadReport(format: ExportFormat) {
    setPendingFormat(format)
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'classroom',
          sourceId: classId,
          format,
          period,
          includeNames,
          includeObservations,
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? 'Impossible de générer ce rapport.')
      }

      const blob = await response.blob()
      const disposition = response.headers.get('Content-Disposition') ?? ''
      const filename =
        /filename="([^"]+)"/.exec(disposition)?.[1] ?? `rapport-classe.${format}`
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = filename
      window.document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      showToast(`Rapport ${format.toUpperCase()} généré.`, 'success')
    } catch (error) {
      console.error('[classroom:report] téléchargement impossible', error)
      showToast(
        error instanceof Error ? error.message : 'Impossible de générer ce rapport.',
        'error'
      )
    } finally {
      setPendingFormat(null)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" className="min-h-10" onClick={() => setIsOpen(true)}>
        <FileDown /> Exporter le rapport
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center sm:p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="class-report-title"
            className="w-full rounded-t-lg border border-border bg-card p-5 shadow-xl sm:max-w-lg sm:rounded-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="class-report-title" className="text-lg font-black">
                  Rapport de classe
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choisissez les données à inclure dans le document.
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Fermer"
                onClick={() => setIsOpen(false)}
              >
                <X />
              </Button>
            </div>

            <div className="mt-5 space-y-5">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Période du rapport</legend>
                <div className="grid grid-cols-3 gap-2">
                  {PERIODS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setPeriod(item.value)}
                      className={`min-h-10 rounded-md border px-3 text-sm font-semibold transition-colors ${
                        period === item.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-3">
                <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                  <span>
                    <strong className="block text-sm">Afficher les noms</strong>
                    <small className="text-muted-foreground">
                      Désactivez pour obtenir un rapport anonymisé.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={includeNames}
                    onChange={(event) => setIncludeNames(event.target.checked)}
                    className="h-5 w-5 accent-primary"
                  />
                </label>
                <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                  <span>
                    <strong className="block text-sm">Inclure les observations</strong>
                    <small className="text-muted-foreground">
                      Ajoute les faits récents enregistrés en séance.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={includeObservations}
                    onChange={(event) => setIncludeObservations(event.target.checked)}
                    className="h-5 w-5 accent-primary"
                  />
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={pendingFormat !== null}
                  onClick={() => void downloadReport('pdf')}
                >
                  {pendingFormat === 'pdf' ? <Loader2 className="animate-spin" /> : <FileText />}
                  Télécharger PDF
                </Button>
                <Button
                  type="button"
                  className="min-h-11"
                  disabled={pendingFormat !== null}
                  onClick={() => void downloadReport('docx')}
                >
                  {pendingFormat === 'docx' ? <Loader2 className="animate-spin" /> : <Download />}
                  Télécharger DOCX
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
