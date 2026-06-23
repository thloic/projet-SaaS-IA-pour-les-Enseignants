'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpenCheck, Plus, Users, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { classSchema } from '@/features/classroom/schemas/classroomSchema'
import type { ClassRoom } from '@/features/classroom/types/classroom.types'

const BRAND = '#534AB7'

export default function ClassroomHome() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [level, setLevel] = useState('')
  const [subject, setSubject] = useState('')

  useEffect(() => {
    void loadClasses()
  }, [])

  async function loadClasses() {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: queryError } = await supabase
      .from('classes')
      .select('*')
      .order('created_at', { ascending: false })

    setIsLoading(false)

    if (queryError) {
      setError(queryError.message)
      return
    }

    setClasses((data ?? []) as ClassRoom[])
  }

  async function handleCreateClass(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const parsed = classSchema.safeParse({ name, level, subject })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Classe incomplete.')
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
      setError('Connectez-vous pour creer une classe.')
      return
    }

    const { error: insertError } = await supabase.from('classes').insert({
      user_id: user.id,
      name: parsed.data.name,
      level: parsed.data.level,
      subject: parsed.data.subject,
    })

    setIsSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setName('')
    setLevel('')
    setSubject('')
    await loadClasses()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24 lg:pb-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${BRAND}22`, color: BRAND }}
            >
              <BookOpenCheck size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black">Gestion de classe</h1>
              <p className="text-sm text-muted-foreground">
                Classes, eleves, presences, participation et observations rapides.
              </p>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <form
          onSubmit={handleCreateClass}
          className="rounded-2xl border border-border bg-card/50 p-4 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Plus size={16} style={{ color: BRAND }} />
            <h2 className="font-bold">Nouvelle classe</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-name">Nom</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Groupe 201"
              className="bg-muted/40"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="class-level">Niveau</Label>
              <Input
                id="class-level"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                placeholder="Secondaire 2"
                className="bg-muted/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-subject">Matiere</Label>
              <Input
                id="class-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Mathematiques"
                className="bg-muted/40"
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full text-white"
            style={{ backgroundColor: BRAND }}
            disabled={isSaving}
          >
            {isSaving ? 'Creation...' : 'Creer la classe'}
          </Button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Mes classes</h2>
            <Badge variant="outline">{classes.length} classe{classes.length > 1 ? 's' : ''}</Badge>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
              Chargement des classes...
            </div>
          ) : classes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
              Aucune classe pour le moment. Creez votre premiere classe pour demarrer les appels.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {classes.map((item) => (
                <button
                  key={item.id}
                  onClick={() => router.push(`/classroom/${item.id}`)}
                  className="group rounded-2xl border border-border bg-card/50 p-4 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{item.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.level} · {item.subject}
                      </p>
                    </div>
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground transition-colors group-hover:text-foreground"
                    >
                      <ArrowRight size={16} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Users size={14} />
                    <span>Ouvrir la classe</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
