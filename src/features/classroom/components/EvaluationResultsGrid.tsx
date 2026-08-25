'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { Download, Pencil, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/shared/ToastProvider'
import {
  deleteEvaluationResultAction,
  saveEvaluationResultAction,
  saveEvaluationResultsBatchAction,
  updateEvaluationResultAction,
  type EvaluationResultWithStudent,
} from '@/features/classroom/server/evaluationResults.actions'
import {
  importClassEvaluationResultsCsvAction,
  type EvaluationCsvImportSkippedRow,
} from '@/features/classroom/server/evaluationResultsImport'
import type { StudentProfile } from '@/features/classroom/types/classroom.types'
import type { GradingSystem } from '@/features/profile/types/profile.types'

interface EvaluationResultsGridProps {
  classId: string
  students: StudentProfile[]
  initialResults: EvaluationResultWithStudent[]
  gradingSystem: GradingSystem
}

const PLACEHOLDERS: Record<GradingSystem, string> = {
  '20': 'Ex. 16/20',
  '10': 'Ex. 8/10',
  letter: 'Ex. A',
  percentage: 'Ex. 85 %',
  letter_ca: 'Ex. B+',
  levels: 'Ex. Niveau 3',
}

export default function EvaluationResultsGrid({
  classId,
  students,
  initialResults,
  gradingSystem,
}: EvaluationResultsGridProps) {
  const { showToast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [grades, setGrades] = useState<Record<string, string>>({})
  const [results, setResults] = useState(initialResults)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editGrade, setEditGrade] = useState('')
  const [individualStudentId, setIndividualStudentId] = useState(students[0]?.id ?? '')
  const [individualGrade, setIndividualGrade] = useState('')
  const [importSkipped, setImportSkipped] = useState<EvaluationCsvImportSkippedRow[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filledResults = useMemo(
    () => students.flatMap((student) => {
      const grade = grades[student.id]?.trim()
      return grade ? [{ studentId: student.id, grade }] : []
    }),
    [grades, students]
  )

  function saveBatch() {
    if (filledResults.length === 0) {
      showToast('Saisissez au moins un résultat.', 'error')
      return
    }
    startTransition(async () => {
      const response = await saveEvaluationResultsBatchAction({ classId, title, results: filledResults })
      if (response.error || !response.data) {
        showToast(response.error ?? 'Enregistrement impossible.', 'error')
        return
      }
      const names = new Map(students.map((student) => [student.id, `${student.first_name} ${student.last_name}`.trim()]))
      setResults((current) => [
        ...response.data!.map((result) => ({ ...result, studentName: names.get(result.student_id) ?? 'Élève' })),
        ...current,
      ])
      setGrades({})
      showToast(`${response.data.length} résultat${response.data.length > 1 ? 's' : ''} enregistré${response.data.length > 1 ? 's' : ''}.`, 'success')
    })
  }

  function importCsv(file: File) {
    setImportSkipped([])
    startTransition(async () => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await importClassEvaluationResultsCsvAction(classId, title, formData)
      if (fileInputRef.current) fileInputRef.current.value = ''

      if (response.error) {
        showToast(response.error, 'error')
        return
      }
      setImportSkipped(response.skipped)
      if (response.saved.length > 0) {
        setResults((current) => [...response.saved, ...current])
        showToast(`${response.saved.length} résultat${response.saved.length > 1 ? 's' : ''} importé${response.saved.length > 1 ? 's' : ''}.`, 'success')
      } else if (response.skipped.length > 0) {
        showToast('Aucune ligne n’a pu être enregistrée — voir le détail ci-dessous.', 'error')
      }
    })
  }

  function addIndividual() {
    if (!individualStudentId || !individualGrade.trim()) {
      showToast('Choisissez un élève et saisissez son résultat.', 'error')
      return
    }
    startTransition(async () => {
      const response = await saveEvaluationResultAction(
        classId,
        individualStudentId,
        title,
        individualGrade
      )
      if (response.error || !response.data) {
        showToast(response.error ?? 'Enregistrement impossible.', 'error')
        return
      }
      const student = students.find(({ id }) => id === individualStudentId)
      setResults((current) => [{
        ...response.data!,
        studentName: student ? `${student.first_name} ${student.last_name}`.trim() : 'Élève',
      }, ...current])
      setIndividualGrade('')
      showToast('Résultat enregistré.', 'success')
    })
  }

  function beginEdit(result: EvaluationResultWithStudent) {
    setEditingId(result.id)
    setEditTitle(result.title ?? '')
    setEditGrade(result.grade)
  }

  function saveEdit(resultId: string) {
    startTransition(async () => {
      const response = await updateEvaluationResultAction(resultId, { title: editTitle, grade: editGrade })
      if (response.error || !response.data) {
        showToast(response.error ?? 'Modification impossible.', 'error')
        return
      }
      setResults((current) => current.map((result) =>
        result.id === resultId ? { ...result, ...response.data! } : result
      ))
      setEditingId(null)
      showToast('Résultat modifié.', 'success')
    })
  }

  function remove(resultId: string) {
    if (!window.confirm('Supprimer ce résultat ?')) return
    startTransition(async () => {
      const response = await deleteEvaluationResultAction(resultId)
      if (response.error) {
        showToast(response.error, 'error')
        return
      }
      setResults((current) => current.filter(({ id }) => id !== resultId))
      showToast('Résultat supprimé.', 'success')
    })
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-bold">Nouvelle évaluation</h2>
          <p className="text-sm text-muted-foreground">Les lignes laissées vides ne seront pas enregistrées.</p>
        </div>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="Titre facultatif — ex. Contrôle de fractions"
          aria-label="Titre de l’évaluation"
        />
        {students.length === 0 ? (
          <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Ajoutez d’abord des élèves à cette classe.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/60 text-left">
                <tr><th className="px-4 py-3 font-semibold">Élève</th><th className="px-4 py-3 font-semibold">Résultat</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-4 py-3 font-medium">{student.first_name} {student.last_name}</td>
                    <td className="px-4 py-2">
                      <Input
                        value={grades[student.id] ?? ''}
                        onChange={(event) => setGrades((current) => ({ ...current, [student.id]: event.target.value }))}
                        maxLength={50}
                        placeholder={PLACEHOLDERS[gradingSystem]}
                        aria-label={`Résultat de ${student.first_name} ${student.last_name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Button onClick={saveBatch} disabled={isPending || students.length === 0}>
          <Save /> Enregistrer {filledResults.length > 0 ? `(${filledResults.length})` : ''}
        </Button>

        {students.length > 0 && (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-semibold">Ou importer un fichier CSV</p>
            <p className="text-xs text-muted-foreground">
              Téléchargez le modèle pré-rempli avec vos élèves, complétez la colonne « Note » dans votre tableur, puis réimportez-le. Le titre saisi ci-dessus s’applique à tout l’import.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={`/api/classroom/${classId}/evaluations/template`}>
                  <Download /> Télécharger le modèle CSV
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload /> Importer un CSV rempli
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) importCsv(file)
                }}
              />
            </div>
            {importSkipped.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                <p className="font-semibold">{importSkipped.length} ligne{importSkipped.length > 1 ? 's' : ''} ignorée{importSkipped.length > 1 ? 's' : ''} :</p>
                <ul className="mt-1 list-inside list-disc">
                  {importSkipped.map((row) => (
                    <li key={row.line}>Ligne {row.line} : {row.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-bold">Historique</h2>
          <p className="text-sm text-muted-foreground">Ajoutez, corrigez ou supprimez un résultat individuel.</p>
        </div>
        {students.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <select
              value={individualStudentId}
              onChange={(event) => setIndividualStudentId(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Élève"
            >
              {students.map((student) => <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>)}
            </select>
            <Input value={individualGrade} onChange={(event) => setIndividualGrade(event.target.value)} maxLength={50} placeholder={PLACEHOLDERS[gradingSystem]} aria-label="Résultat individuel" />
            <Button variant="outline" onClick={addIndividual} disabled={isPending}><Plus /> Ajouter</Button>
          </div>
        )}
        {results.length === 0 ? (
          <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Aucun résultat enregistré.</p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border">
            {results.map((result) => (
              <div key={result.id} className="grid gap-3 p-4 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center">
                <div><p className="font-semibold">{result.studentName}</p><p className="text-xs text-muted-foreground">{new Date(result.created_at).toLocaleDateString('fr-FR')}</p></div>
                {editingId === result.id ? (
                  <>
                    <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={120} placeholder="Titre facultatif" aria-label="Modifier le titre" />
                    <Input value={editGrade} onChange={(event) => setEditGrade(event.target.value)} maxLength={50} aria-label="Modifier le résultat" />
                  </>
                ) : (
                  <><p className="text-sm text-muted-foreground">{result.title || 'Évaluation sans titre'}</p><p className="font-bold">{result.grade}</p></>
                )}
                <div className="flex justify-end gap-1">
                  {editingId === result.id ? (
                    <><Button size="icon" variant="ghost" onClick={() => saveEdit(result.id)} disabled={isPending} aria-label="Enregistrer la modification"><Save /></Button><Button size="icon" variant="ghost" onClick={() => setEditingId(null)} aria-label="Annuler"><X /></Button></>
                  ) : (
                    <><Button size="icon" variant="ghost" onClick={() => beginEdit(result)} aria-label="Modifier"><Pencil /></Button><Button size="icon" variant="ghost" onClick={() => remove(result.id)} disabled={isPending} aria-label="Supprimer"><Trash2 /></Button></>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
