'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Save, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/shared/ToastProvider'
import type { ClassWithStudents } from '@/features/classroom/server/classroom.actions'
import { extractDocumentTextAction } from '@/features/documents/server/document.actions'
import { createCorrectionBatchAction } from '@/features/correction/server/correction.actions'

const BRAND = '#534AB7'

interface CorrectionBatchFormProps {
  classes: ClassWithStudents[]
}

export default function CorrectionBatchForm({ classes }: CorrectionBatchFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [classId, setClassId] = useState('')
  const [copyTexts, setCopyTexts] = useState<Record<string, string>>({})
  const [readingFileFor, setReadingFileFor] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Classes et eleves sont precharges par la page : changer de classe est un
  // lookup local, sans aller-retour reseau.
  const students = useMemo(
    () => classes.find((item) => item.id === classId)?.students ?? [],
    [classes, classId]
  )

  function handleClassChange(nextClassId: string) {
    setClassId(nextClassId)
    setCopyTexts({})
  }

  function handleTextChange(studentId: string, value: string) {
    setCopyTexts((current) => ({ ...current, [studentId]: value }))
  }

  async function handleFileChange(studentId: string, file: File | undefined) {
    if (!file) return
    setReadingFileFor(studentId)
    try {
      const result = await extractDocumentTextAction(file)
      if (result.error || !result.text) {
        showToast(result.error ?? 'Impossible d’extraire le texte de ce fichier.', 'error')
        return
      }
      handleTextChange(studentId, result.text)
      if (result.warning) showToast(result.warning, 'error')
    } catch (error) {
      console.error('[correction] lecture du fichier impossible', error)
      showToast('Impossible de lire ce fichier.', 'error')
    } finally {
      setReadingFileFor(null)
      const input = fileInputRefs.current[studentId]
      if (input) input.value = ''
    }
  }

  const filledCount = students.filter((student) => (copyTexts[student.id] ?? '').trim().length > 0).length

  async function handleSave() {
    if (!classId || filledCount === 0) return
    setIsSaving(true)
    try {
      const rawCopies = students.map((student) => ({
        studentId: student.id,
        contentText: copyTexts[student.id] ?? '',
      }))
      const result = await createCorrectionBatchAction(classId, rawCopies)
      if (result.error || !result.batchId) {
        showToast(result.error ?? 'Impossible d’enregistrer ce lot.', 'error')
        return
      }
      showToast('Lot de correction enregistré.', 'success')
      router.push(`/correction/${result.batchId}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-700 dark:text-amber-200">
        <span>Vous n&apos;avez pas encore créé de classe. Créez-en une pour pouvoir importer des copies.</span>
        <Link href="/classroom" className="font-semibold underline underline-offset-2">
          Aller au module Classe
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium">Classe</label>
        <select
          className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          value={classId}
          onChange={(event) => handleClassChange(event.target.value)}
        >
          <option value="">Sélectionnez une classe</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {classId && students.length === 0 && (
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Cette classe n&apos;a pas encore d&apos;élève.
        </div>
      )}

      {students.length > 0 && (
        <div className="space-y-4">
          {students.map((student) => (
            <div key={student.id} className="space-y-2 rounded-2xl border border-border bg-card/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-sm">{student.first_name} {student.last_name}</p>
                <div className="flex items-center gap-2">
                  <input
                    ref={(element) => { fileInputRefs.current[student.id] = element }}
                    type="file"
                    accept=".txt,.pdf,.docx"
                    className="hidden"
                    id={`file-${student.id}`}
                    onChange={(event) => void handleFileChange(student.id, event.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={readingFileFor === student.id}
                    onClick={() => fileInputRefs.current[student.id]?.click()}
                  >
                    {readingFileFor === student.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Importer un fichier
                  </Button>
                </div>
              </div>
              <textarea
                value={copyTexts[student.id] ?? ''}
                onChange={(event) => handleTextChange(student.id, event.target.value)}
                placeholder="Coller le texte de la copie, ou importer un fichier texte/PDF…"
                rows={4}
                className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              />
            </div>
          ))}
        </div>
      )}

      {students.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {filledCount} sur {students.length} élève(s) ont une copie renseignée. Les autres seront ignorés.
          </p>
          <div
            onClick={
              !isSaving && filledCount === 0
                ? () => showToast('Renseignez au moins une copie avant d’enregistrer.', 'error')
                : undefined
            }
          >
            <Button
              type="button"
              className={`gap-2 text-white ${filledCount === 0 ? 'pointer-events-none' : ''}`}
              style={{ backgroundColor: BRAND }}
              disabled={isSaving || filledCount === 0}
              onClick={() => void handleSave()}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Enregistrer le lot ({filledCount})
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}
