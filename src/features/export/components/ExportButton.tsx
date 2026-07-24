'use client'

import { useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/shared/ToastProvider'
import type { ExportFormat, ExportSource } from '@/features/export/types/export.types'
import type { VariantType } from '@/features/adaptation/schemas/adaptationSchema'

interface ExportButtonProps {
  source: ExportSource
  sourceId: string
  variantType?: VariantType
  disabled?: boolean
}

export default function ExportButton({ source, sourceId, variantType, disabled }: ExportButtonProps) {
  const { showToast } = useToast()
  const [pendingFormat, setPendingFormat] = useState<ExportFormat | null>(null)

  async function handleExport(format: ExportFormat) {
    setPendingFormat(format)
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, sourceId, variantType, format }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? 'L’export a échoué.')
      }

      const blob = await response.blob()
      const disposition = response.headers.get('Content-Disposition') ?? ''
      const match = /filename="([^"]+)"/.exec(disposition)
      const filename = match?.[1] ?? `export.${format}`

      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = filename
      window.document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('[export] téléchargement échoué', error)
      showToast(error instanceof Error ? error.message : 'L’export a échoué.', 'error')
    } finally {
      setPendingFormat(null)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        className="min-h-10 flex-1 justify-start"
        disabled={disabled || pendingFormat !== null}
        onClick={() => void handleExport('pdf')}
      >
        {pendingFormat === 'pdf' ? <Loader2 className="animate-spin" /> : <FileText />}
        Exporter PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-10 flex-1 justify-start"
        disabled={disabled || pendingFormat !== null}
        onClick={() => void handleExport('docx')}
      >
        {pendingFormat === 'docx' ? <Loader2 className="animate-spin" /> : <Download />}
        Exporter DOCX
      </Button>
    </div>
  )
}
