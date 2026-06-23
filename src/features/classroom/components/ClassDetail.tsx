'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, Play, Plus, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { studentSchema } from '@/features/classroom/schemas/classroomSchema'
import type { ClassRoom, ClassStudent, StudentProfile } from '@/features/classroom/types/classroom.types'

const BRAND = '#534AB7'

interface ClassDetailProps {
  classId: string
}

type JoinedStudent = ClassStudent & {
  student_profiles: StudentProfile | null
}

export default function ClassDetail({ classId }: ClassDetailProps) {
  const router = useRouter()
  const [classroom, setClassroom] = useState<ClassRoom | null>(null)
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [language, setLanguage] = useState('fr')
  const [needs, setNeeds] = useState('')

  const sortedStudents = useMemo(
    () =>
      [...students].sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
      ),
    [students]
  )

  useEffect(() => {
    void loadClass()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId])

  async function loadClass() {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .maybeSingle()

    if (classError || !classData) {
      setIsLoading(false)
      setError(classError?.message ?? 'Classe introuvable.')
      return
    }

    const { data: links, error: linkError } = await supabase
      .from('class_students')
      .select('id, user_id, class_id, student_id, student_profiles(*)')
      .eq('class_id', classId)

    setIsLoading(false)

    if (linkError) {
      setError(linkError.message)
      setClassroom(classData as ClassRoom)
      return
    }

    const joined = (links ?? []) as unknown as JoinedStudent[]
    setClassroom(classData as ClassRoom)
    setStudents(joined.map((item) => item.student_profiles).filter(Boolean) as StudentProfile[])
  }

  async function handleAddStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const parsed = studentSchema.safeParse({ firstName, lastName, language, needs })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Eleve incomplet.')
      return
    }

    setIsSaving(true)
    const supabase = createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setIsSaving(false)
      setError('Connectez-vous pour ajouter un eleve.')
      return
    }

    const needsList = (parsed.data.needs ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    const { data: student, error: studentError } = await supabase
      .from('student_profiles')
      .insert({
        user_id: user.id,
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        language: parsed.data.language,
        needs: needsList,
      })
      .select('*')
      .single()

    if (studentError || !student) {
      setIsSaving(false)
      setError(studentError?.message ?? 'Impossible de creer cet eleve.')
      return
    }

    const { error: linkError } = await supabase.from('class_students').insert({
      user_id: user.id,
      class_id: classId,
      student_id: (student as StudentProfile).id,
    })

    setIsSaving(false)

    if (linkError) {
      setError(linkError.message)
      return
    }

    setFirstName('')
    setLastName('')
    setLanguage('fr')
    setNeeds('')
    await loadClass()
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first-name">Prenom</Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Nora"
                className="bg-muted/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Nom</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Martin"
                className="bg-muted/40"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Langue</Label>
            <Input
              id="language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              placeholder="fr"
              className="bg-muted/40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="needs">Besoins / notes rapides</Label>
            <Input
              id="needs"
              value={needs}
              onChange={(event) => setNeeds(event.target.value)}
              placeholder="DYS, TDAH, allophone"
              className="bg-muted/40"
            />
            <p className="text-xs text-muted-foreground">Separez les besoins par des virgules.</p>
          </div>
          <Button
            type="submit"
            className="w-full text-white"
            style={{ backgroundColor: BRAND }}
            disabled={isSaving}
          >
            {isSaving ? 'Ajout...' : 'Ajouter a la classe'}
          </Button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Eleves</h2>
            <Badge variant="outline">{students.length} eleve{students.length > 1 ? 's' : ''}</Badge>
          </div>

          {sortedStudents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
              Ajoutez quelques eleves pour pouvoir lancer une session de presence.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {sortedStudents.map((student) => (
                <div key={student.id} className="rounded-2xl border border-border bg-card/50 p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: BRAND }}
                    >
                      <UserRound size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">Langue : {student.language}</p>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
