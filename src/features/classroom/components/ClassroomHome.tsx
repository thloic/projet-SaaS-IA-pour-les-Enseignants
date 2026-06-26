'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, BookOpenCheck, Check, Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/shared/ToastProvider'
import { useConfirm } from '@/components/shared/ConfirmProvider'
import { classSchema } from '@/features/classroom/schemas/classroomSchema'
import type { ClassRoom } from '@/features/classroom/types/classroom.types'

const BRAND = '#534AB7'

export default function ClassroomHome() {
  const router = useRouter()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [level, setLevel] = useState('')
  const [subject, setSubject] = useState('')
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null)
  const [editName, setEditName] = useState('')
  const [editLevel, setEditLevel] = useState('')
  const [editSubject, setEditSubject] = useState('')

  const loadClasses = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      const { data, error: queryError } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false })

      if (queryError) throw queryError

      setClasses((data ?? []) as ClassRoom[])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de charger les classes.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadClasses()
  }, [loadClasses])

  async function handleCreateClass(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const parsed = classSchema.safeParse({ name, level, subject })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Classe incomplete.')
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
        throw new Error('Connectez-vous pour creer une classe.')
      }

      const { data: createdClass, error: insertError } = await supabase
        .from('classes')
        .insert({
          user_id: user.id,
          name: parsed.data.name,
          level: parsed.data.level,
          subject: parsed.data.subject,
        })
        .select('*')
        .single()

      if (insertError || !createdClass) {
        throw insertError ?? new Error('Impossible de creer la classe.')
      }

      setName('')
      setLevel('')
      setSubject('')
      setClasses((current) => [createdClass as ClassRoom, ...current])
      showToast(`Classe "${parsed.data.name}" enregistree.`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de creer la classe.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  function openEditClass(item: ClassRoom) {
    setEditingClass(item)
    setEditName(item.name)
    setEditLevel(item.level)
    setEditSubject(item.subject)
  }

  async function handleUpdateClass(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingClass) return

    const parsed = classSchema.safeParse({ name: editName, level: editLevel, subject: editSubject })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Classe incomplete.')
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const supabase = createClient()
      const { data, error: updateError } = await supabase
        .from('classes')
        .update({
          name: parsed.data.name,
          level: parsed.data.level,
          subject: parsed.data.subject,
        })
        .eq('id', editingClass.id)
        .select('*')
        .single()

      if (updateError || !data) {
        throw updateError ?? new Error('Impossible de modifier la classe.')
      }

      setClasses((current) => current.map((item) => (item.id === editingClass.id ? data as ClassRoom : item)))
      setEditingClass(null)
      showToast('Classe mise a jour.', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de modifier la classe.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteClass(item: ClassRoom) {
    const accepted = await confirm({
      title: 'Supprimer cette classe ?',
      message: `La classe "${item.name}" et ses donnees associees seront supprimees.`,
      confirmLabel: 'Supprimer',
    })
    if (!accepted) return

    try {
      setIsDeleting(true)
      setError(null)

      const supabase = createClient()
      const { error: deleteError } = await supabase.from('classes').delete().eq('id', item.id)
      if (deleteError) throw deleteError

      setClasses((current) => current.filter((classroom) => classroom.id !== item.id))
      showToast('Classe supprimee.', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de supprimer cette classe.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsDeleting(false)
    }
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
                <div
                  key={item.id}
                  className="group rounded-2xl border border-border bg-card/50 p-4 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button className="min-w-0 flex-1 text-left" onClick={() => router.push(`/classroom/${item.id}`)}>
                      <p className="truncate font-bold">{item.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.level} · {item.subject}
                      </p>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/classroom/${item.id}`)}
                      aria-label="Ouvrir la classe"
                    >
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/classroom/${item.id}`)}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Users size={14} />
                      <span>Ouvrir la classe</span>
                    </button>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditClass(item)}
                        aria-label="Modifier la classe"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => void handleDeleteClass(item)}
                        disabled={isDeleting}
                        aria-label="Supprimer la classe"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 sm:items-center sm:justify-center sm:p-4">
          <form
            onSubmit={handleUpdateClass}
            className="w-full rounded-t-2xl border border-border bg-card p-4 shadow-xl sm:max-w-md sm:rounded-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">Modifier la classe</h2>
                <p className="text-sm text-muted-foreground">Nom, niveau et matiere.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setEditingClass(null)}>
                <X size={16} />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-class-name">Nom</Label>
                <Input
                  id="edit-class-name"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="bg-muted/40"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-class-level">Niveau</Label>
                  <Input
                    id="edit-class-level"
                    value={editLevel}
                    onChange={(event) => setEditLevel(event.target.value)}
                    className="bg-muted/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-class-subject">Matiere</Label>
                  <Input
                    id="edit-class-subject"
                    value={editSubject}
                    onChange={(event) => setEditSubject(event.target.value)}
                    className="bg-muted/40"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingClass(null)}>
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
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
