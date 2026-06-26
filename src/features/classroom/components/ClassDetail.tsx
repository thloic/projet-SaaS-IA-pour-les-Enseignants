'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FileSpreadsheet,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/shared/ToastProvider'
import { useConfirm } from '@/components/shared/ConfirmProvider'
import { studentSchema } from '@/features/classroom/schemas/classroomSchema'
import type { ClassRoom, ClassStudent, StudentProfile } from '@/features/classroom/types/classroom.types'

const BRAND = '#534AB7'

interface ClassDetailProps {
  classId: string
}

type JoinedStudent = ClassStudent & {
  student_profiles: StudentProfile | null
}

interface StudentFormState {
  firstName: string
  lastName: string
  sex: 'M' | 'F'
  familyLanguage: string
  needs: string
  interventionPlan: boolean
  generalNotes: string
}

const emptyStudentForm: StudentFormState = {
  firstName: '',
  lastName: '',
  sex: 'M',
  familyLanguage: 'fr',
  needs: '',
  interventionPlan: false,
  generalNotes: '',
}

function needsToText(needs: string[]) {
  return needs.join(', ')
}

function splitNeeds(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getFamilyLanguage(student: StudentProfile) {
  return student.family_language || student.language || 'fr'
}

function studentToForm(student: StudentProfile): StudentFormState {
  return {
    firstName: student.first_name,
    lastName: student.last_name,
    sex: student.sex,
    familyLanguage: getFamilyLanguage(student),
    needs: needsToText(student.needs ?? []),
    interventionPlan: Boolean(student.intervention_plan),
    generalNotes: student.general_notes ?? '',
  }
}

function normalizeStudent(student: StudentProfile): StudentProfile {
  return {
    ...student,
    family_language: student.family_language || student.language || 'fr',
    intervention_plan: Boolean(student.intervention_plan),
    general_notes: student.general_notes ?? '',
    needs: student.needs ?? [],
  }
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export default function ClassDetail({ classId }: ClassDetailProps) {
  const router = useRouter()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const [classroom, setClassroom] = useState<ClassRoom | null>(null)
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<StudentFormState>(emptyStudentForm)
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null)
  const [isEditingStudent, setIsEditingStudent] = useState(false)
  const [editForm, setEditForm] = useState<StudentFormState>(emptyStudentForm)

  const sortedStudents = useMemo(() => {
    const query = search.trim().toLowerCase()

    return [...students]
      .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))
      .filter((student) => {
        if (!query) return true
        const haystack = [
          student.first_name,
          student.last_name,
          getFamilyLanguage(student),
          ...(student.needs ?? []),
          student.intervention_plan ? 'pei ppi plan intervention' : '',
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(query)
      })
  }, [search, students])

  const loadClass = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .maybeSingle()

      if (classError || !classData) {
        throw classError ?? new Error('Classe introuvable.')
      }

      const { data: links, error: linkError } = await supabase
        .from('class_students')
        .select('id, user_id, class_id, student_id, student_profiles(*)')
        .eq('class_id', classId)
        .order('last_name', { foreignTable: 'student_profiles' })
        .order('first_name', { foreignTable: 'student_profiles' })

      if (linkError) throw linkError

      const joined = (links ?? []) as unknown as JoinedStudent[]
      setClassroom(classData as ClassRoom)
      setStudents(
        joined
          .map((item) => item.student_profiles)
          .filter(Boolean)
          .map((student) => normalizeStudent(student as StudentProfile))
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de charger la classe.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [classId, showToast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadClass()
  }, [loadClass])

  function updateForm<K extends keyof StudentFormState>(key: K, value: StudentFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updateEditForm<K extends keyof StudentFormState>(key: K, value: StudentFormState[K]) {
    setEditForm((current) => ({ ...current, [key]: value }))
  }

  async function handleAddStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const parsed = studentSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Eleve incomplet.')
      return
    }

    try {
      setIsSaving(true)
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Connectez-vous pour ajouter un eleve.')
      }

      const needsList = splitNeeds(parsed.data.needs ?? '')
      const { data: student, error: studentError } = await supabase
        .from('student_profiles')
        .insert({
          user_id: user.id,
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
          sex: parsed.data.sex,
          language: parsed.data.familyLanguage,
          family_language: parsed.data.familyLanguage,
          needs: needsList,
          intervention_plan: parsed.data.interventionPlan,
          general_notes: parsed.data.generalNotes ?? '',
        })
        .select('*')
        .single()

      if (studentError || !student) {
        throw studentError ?? new Error('Impossible de creer cet eleve.')
      }

      const { error: linkError } = await supabase.from('class_students').insert({
        user_id: user.id,
        class_id: classId,
        student_id: (student as StudentProfile).id,
      })

      if (linkError) throw linkError

      const normalized = normalizeStudent(student as StudentProfile)
      setStudents((current) => [normalized, ...current])
      setForm(emptyStudentForm)
      showToast(`${parsed.data.firstName} ${parsed.data.lastName} ajoute a la classe.`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible d ajouter cet eleve.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  function parseStudentCsv(text: string) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length === 0) return []

    const delimiter = [';', ',', '\t'].sort(
      (a, b) => lines[0].split(b).length - lines[0].split(a).length
    )[0]

    const rawRows = lines.map((line) => line.split(delimiter).map((cell) => cell.trim()))
    const firstRow = rawRows[0].map(normalizeHeader)
    const hasHeader = firstRow.some((cell) =>
      [
        'prenom',
        'first_name',
        'firstname',
        'nom',
        'last_name',
        'lastname',
        'sexe',
        'sex',
        'pei',
        'ppi',
      ].includes(cell)
    )
    const headers = hasHeader
      ? firstRow
      : ['prenom', 'nom', 'sexe', 'langue', 'besoins', 'pei', 'notes']
    const rows = hasHeader ? rawRows.slice(1) : rawRows

    function value(row: string[], keys: string[], fallbackIndex: number) {
      const index = headers.findIndex((header) => keys.includes(header))
      return row[index >= 0 ? index : fallbackIndex]?.trim() ?? ''
    }

    return rows
      .map((row) => {
        const rawSex = value(row, ['sexe', 'sex'], 2).toUpperCase()
        const rawPlan = normalizeHeader(value(row, ['pei', 'ppi', 'plan', 'plan_intervention'], 5))
        return {
          firstName: value(row, ['prenom', 'first_name', 'firstname', 'first name'], 0),
          lastName: value(row, ['nom', 'last_name', 'lastname', 'last name'], 1),
          sex: rawSex === 'F' ? ('F' as const) : ('M' as const),
          familyLanguage: value(row, ['langue', 'language', 'family_language', 'langue familiale'], 3) || 'fr',
          needs: value(row, ['besoins', 'needs'], 4),
          interventionPlan: ['oui', 'yes', 'true', '1', 'x'].includes(rawPlan),
          generalNotes: value(row, ['notes', 'note', 'observations', 'general_notes'], 6),
        }
      })
      .filter((row) => row.firstName && row.lastName)
  }

  async function handleImportCsv(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      setIsImporting(true)
      setError(null)
      const rows = parseStudentCsv(await file.text())
      if (rows.length === 0) {
        throw new Error('Aucun eleve valide trouve. Colonnes attendues : prenom, nom, sexe, langue, besoins, pei, notes.')
      }

      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Connectez-vous pour importer des eleves.')
      }

      const studentsToInsert = rows.map((row) => ({
        user_id: user.id,
        first_name: row.firstName,
        last_name: row.lastName,
        sex: row.sex,
        language: row.familyLanguage,
        family_language: row.familyLanguage,
        needs: splitNeeds(row.needs),
        intervention_plan: row.interventionPlan,
        general_notes: row.generalNotes,
      }))

      const { data: insertedStudents, error: insertError } = await supabase
        .from('student_profiles')
        .insert(studentsToInsert)
        .select('*')

      if (insertError || !insertedStudents) {
        throw insertError ?? new Error('Import impossible.')
      }

      const links = (insertedStudents as StudentProfile[]).map((student) => ({
        user_id: user.id,
        class_id: classId,
        student_id: student.id,
      }))

      const { error: linkError } = await supabase.from('class_students').insert(links)
      if (linkError) throw linkError

      setStudents((current) => [
        ...(insertedStudents as StudentProfile[]).map(normalizeStudent),
        ...current,
      ])
      showToast(`${rows.length} eleve${rows.length > 1 ? 's' : ''} importe${rows.length > 1 ? 's' : ''}.`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import impossible.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsImporting(false)
    }
  }

  function openStudent(student: StudentProfile) {
    setSelectedStudent(student)
    setEditForm(studentToForm(student))
    setIsEditingStudent(false)
  }

  async function handleUpdateStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedStudent) return

    const parsed = studentSchema.safeParse(editForm)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Profil eleve incomplet.')
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const supabase = createClient()
      const payload = {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        sex: parsed.data.sex,
        language: parsed.data.familyLanguage,
        family_language: parsed.data.familyLanguage,
        needs: splitNeeds(parsed.data.needs ?? ''),
        intervention_plan: parsed.data.interventionPlan,
        general_notes: parsed.data.generalNotes ?? '',
      }

      const { data, error: updateError } = await supabase
        .from('student_profiles')
        .update(payload)
        .eq('id', selectedStudent.id)
        .select('*')
        .single()

      if (updateError || !data) {
        throw updateError ?? new Error('Mise a jour impossible.')
      }

      const updated = normalizeStudent(data as StudentProfile)
      setStudents((current) => current.map((student) => (student.id === updated.id ? updated : student)))
      setSelectedStudent(updated)
      setIsEditingStudent(false)
      showToast('Profil eleve mis a jour.', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de modifier cet eleve.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteStudent() {
    if (!selectedStudent) return

    const accepted = await confirm({
      title: 'Supprimer cet eleve ?',
      message: `Le profil de ${selectedStudent.first_name} ${selectedStudent.last_name} sera supprime de cette classe et des donnees associees.`,
      confirmLabel: 'Supprimer',
    })
    if (!accepted) return

    try {
      setIsDeleting(true)
      setError(null)

      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('student_profiles')
        .delete()
        .eq('id', selectedStudent.id)

      if (deleteError) throw deleteError

      setStudents((current) => current.filter((student) => student.id !== selectedStudent.id))
      setSelectedStudent(null)
      setIsEditingStudent(false)
      showToast('Eleve supprime.', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de supprimer cet eleve.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <div className="mx-auto max-w-6xl text-sm text-muted-foreground">Chargement de la classe...</div>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24 lg:pb-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            onClick={() => router.push('/classroom')}
            className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Retour aux classes
          </button>
          <h1 className="text-2xl font-black">{classroom?.name ?? 'Classe'}</h1>
          <p className="text-sm text-muted-foreground">
            {classroom?.level} · {classroom?.subject}
          </p>
        </div>
        <Button
          onClick={() => router.push(`/classroom/${classId}/session`)}
          className="h-11 text-white"
          style={{ backgroundColor: BRAND }}
          disabled={students.length === 0}
        >
          <Play size={16} /> Demarrer une session
        </Button>
      </section>

      {error && (
        <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <form
          onSubmit={handleAddStudent}
          className="rounded-2xl border border-border bg-card/50 p-4 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Plus size={16} style={{ color: BRAND }} />
            <h2 className="font-bold">Ajouter un eleve</h2>
          </div>
          <StudentFields form={form} onChange={updateForm} prefix="new-student" />
          <Button
            type="submit"
            className="w-full text-white"
            style={{ backgroundColor: BRAND }}
            disabled={isSaving}
          >
            {isSaving ? 'Ajout...' : 'Ajouter a la classe'}
          </Button>
          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileSpreadsheet size={15} style={{ color: BRAND }} />
              Importer depuis Excel / Google Sheets
            </div>
            <p className="text-xs text-muted-foreground">
              Exportez en CSV : prenom, nom, sexe, langue, besoins, pei, notes.
            </p>
            <Label
              htmlFor="student-csv"
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40"
            >
              <Upload size={15} /> {isImporting ? 'Import...' : 'Importer un CSV'}
            </Label>
            <input
              id="student-csv"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportCsv}
              disabled={isImporting}
            />
          </div>
        </form>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold">Eleves</h2>
              <p className="text-xs text-muted-foreground">Cliquez sur un eleve pour ouvrir son dossier.</p>
            </div>
            <Badge variant="outline">{students.length} eleve{students.length > 1 ? 's' : ''}</Badge>
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par nom, besoin, langue, PEI..."
              className="h-10 bg-muted/40 pl-9"
            />
          </div>

          {sortedStudents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
              {students.length === 0
                ? 'Ajoutez quelques eleves pour pouvoir lancer une session de presence.'
                : 'Aucun eleve ne correspond a cette recherche.'}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {sortedStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => openStudent(student)}
                  className="rounded-2xl border border-border bg-card/50 p-4 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: BRAND }}
                    >
                      <UserRound size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">
                          {student.first_name} {student.last_name}
                        </p>
                        {student.intervention_plan && (
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            PEI/PPI
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {student.sex} · Langue familiale : {getFamilyLanguage(student)}
                      </p>
                      {student.needs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {student.needs.map((need) => (
                            <Badge key={need} variant="outline" className="text-[10px]">
                              {need}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 sm:items-center sm:justify-center sm:p-4">
          <div className="flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-border bg-card shadow-xl sm:max-w-xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border p-4">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedStudent.sex} · Langue familiale : {getFamilyLanguage(selectedStudent)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSelectedStudent(null)}
                aria-label="Fermer"
              >
                <X size={16} />
              </Button>
            </div>

            <div className="overflow-y-auto p-4">
              {isEditingStudent ? (
                <form onSubmit={handleUpdateStudent} className="space-y-4">
                  <StudentFields form={editForm} onChange={updateEditForm} prefix="edit-student" />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditForm(studentToForm(selectedStudent))
                        setIsEditingStudent(false)
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      className="text-white"
                      style={{ backgroundColor: BRAND }}
                      disabled={isSaving}
                    >
                      <Check size={15} /> {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ProfileInfo label="Sexe" value={selectedStudent.sex} />
                    <ProfileInfo label="Langue familiale" value={getFamilyLanguage(selectedStudent)} />
                    <ProfileInfo
                      label="PEI/PPI"
                      value={selectedStudent.intervention_plan ? 'Oui' : 'Non'}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Besoins pedagogiques</p>
                    {selectedStudent.needs.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedStudent.needs.map((need) => (
                          <Badge key={need} variant="outline">
                            {need}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun besoin renseigne.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Notes generales</p>
                    <p className="min-h-16 rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                      {selectedStudent.general_notes || 'Aucune note generale pour le moment.'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                    Les presences, participations et communications seront rattachees a ce dossier eleve au fil des modules.
                  </div>
                </div>
              )}
            </div>

            {!isEditingStudent && (
              <div className="grid grid-cols-3 gap-2 border-t border-border p-4">
                <Button variant="outline" onClick={() => setIsEditingStudent(true)}>
                  <Pencil size={15} /> Modifier
                </Button>
                <Button variant="destructive" onClick={handleDeleteStudent} disabled={isDeleting}>
                  <Trash2 size={15} /> {isDeleting ? '...' : 'Supprimer'}
                </Button>
                <Button
                  className="text-white"
                  style={{ backgroundColor: BRAND }}
                  onClick={() => router.push(`/classroom/${classId}/session`)}
                >
                  <Play size={15} /> Session
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface StudentFieldsProps {
  form: StudentFormState
  onChange: <K extends keyof StudentFormState>(key: K, value: StudentFormState[K]) => void
  prefix: string
}

function StudentFields({ form, onChange, prefix }: StudentFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-first-name`}>Prenom</Label>
          <Input
            id={`${prefix}-first-name`}
            value={form.firstName}
            onChange={(event) => onChange('firstName', event.target.value)}
            placeholder="Nora"
            className="bg-muted/40"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-last-name`}>Nom</Label>
          <Input
            id={`${prefix}-last-name`}
            value={form.lastName}
            onChange={(event) => onChange('lastName', event.target.value)}
            placeholder="Martin"
            className="bg-muted/40"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Sexe</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['M', 'F'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange('sex', value)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                form.sex === value
                  ? 'border-transparent text-white'
                  : 'border-border text-muted-foreground hover:bg-muted/40'
              }`}
              style={form.sex === value ? { backgroundColor: BRAND } : {}}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-language`}>Langue familiale</Label>
        <Input
          id={`${prefix}-language`}
          value={form.familyLanguage}
          onChange={(event) => onChange('familyLanguage', event.target.value)}
          placeholder="fr"
          className="bg-muted/40"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-needs`}>Besoins pedagogiques</Label>
        <Input
          id={`${prefix}-needs`}
          value={form.needs}
          onChange={(event) => onChange('needs', event.target.value)}
          placeholder="DYS, TDAH, allophone"
          className="bg-muted/40"
        />
        <p className="text-xs text-muted-foreground">Separez les besoins par des virgules.</p>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/20 p-3 text-sm">
        <input
          type="checkbox"
          checked={form.interventionPlan}
          onChange={(event) => onChange('interventionPlan', event.target.checked)}
          className="h-4 w-4 accent-[#534AB7]"
        />
        <span>PEI/PPI ou plan d intervention</span>
      </label>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-notes`}>Notes generales</Label>
        <textarea
          id={`${prefix}-notes`}
          value={form.generalNotes}
          onChange={(event) => onChange('generalNotes', event.target.value)}
          placeholder="Observation utile pour adapter les supports..."
          className="min-h-24 w-full rounded-lg border border-input bg-muted/40 px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
    </>
  )
}

function ProfileInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}
