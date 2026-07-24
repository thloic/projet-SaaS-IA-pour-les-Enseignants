'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  BookOpenCheck,
  ChevronRight,
  FileText,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConfirm } from '@/components/shared/ConfirmProvider'
import { useToast } from '@/components/shared/ToastProvider'
import { deleteAdaptationAction } from '@/features/adaptation/server/adaptation.actions'
import type { AdaptationListItem } from '@/features/adaptation/types/adaptation.types'

interface AdaptationLibraryProps {
  adaptations: AdaptationListItem[]
}

function statusLabel(status: AdaptationListItem['status']) {
  if (status === 'complete') return 'Terminée'
  if (status === 'partial') return 'Partielle'
  if (status === 'generating') return 'En cours'
  return 'Échec'
}

function statusClass(status: AdaptationListItem['status']) {
  if (status === 'complete') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  if (status === 'partial') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  if (status === 'generating') return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
  return 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
}

export default function AdaptationLibrary({ adaptations }: AdaptationLibraryProps) {
  const router = useRouter()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr')
    if (!normalized) return adaptations
    return adaptations.filter((adaptation) =>
      `${adaptation.title} ${adaptation.subject} ${adaptation.level}`
        .toLocaleLowerCase('fr')
        .includes(normalized)
    )
  }, [adaptations, query])

  async function removeAdaptation(adaptation: AdaptationListItem) {
    const accepted = await confirm({
      title: 'Supprimer cette adaptation ?',
      message: `« ${adaptation.title} » et ses cinq variantes seront définitivement supprimées.`,
      confirmLabel: 'Supprimer',
    })
    if (!accepted) return

    setDeletingId(adaptation.id)
    const result = await deleteAdaptationAction(adaptation.id)
    setDeletingId(null)
    if (result.error) {
      showToast(result.error, 'error')
      return
    }
    showToast('Adaptation supprimée.', 'success')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24 lg:pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
            <BookOpenCheck size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black">Leçons adaptées</h1>
            <p className="text-sm text-muted-foreground">
              Retrouvez, réutilisez et partagez vos ressources différenciées.
            </p>
          </div>
        </div>
        <Button asChild className="min-h-10">
          <Link href="/adaptations/new"><Plus /> Adapter une leçon</Link>
        </Button>
      </header>

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher par titre, matière ou niveau..."
          className="min-h-10 pl-9"
        />
      </div>

      {adaptations.length === 0 ? (
        <section className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center">
          <Sparkles size={32} className="mb-4 text-primary" />
          <h2 className="text-lg font-bold">Votre banque est vide</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Choisissez un cours ou importez une leçon pour créer vos premières variantes.
          </p>
          <Button asChild className="mt-5">
            <Link href="/adaptations/new">Créer une adaptation</Link>
          </Button>
        </section>
      ) : filtered.length === 0 ? (
        <div className="flex gap-2 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <AlertCircle size={17} /> Aucun résultat pour cette recherche.
        </div>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((adaptation) => (
            <article
              key={adaptation.id}
              className="flex min-h-56 min-w-0 flex-col rounded-xl border border-border bg-card/50 p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                  <FileText size={18} />
                </span>
                <Badge variant="outline" className={statusClass(adaptation.status)}>
                  {statusLabel(adaptation.status)}
                </Badge>
              </div>
              <div className="mt-4 min-w-0 flex-1">
                <h2 className="break-words font-bold">{adaptation.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {adaptation.subject} · {adaptation.level}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {adaptation.completedVariants}/{adaptation.totalVariants || 5} variantes disponibles
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button asChild variant="outline" className="min-h-9 flex-1">
                  <Link href={`/adaptations/${adaptation.id}`}>
                    Ouvrir <ChevronRight />
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="icon-lg"
                  variant="destructive"
                  title="Supprimer"
                  disabled={deletingId === adaptation.id}
                  onClick={() => void removeAdaptation(adaptation)}
                >
                  <Trash2 />
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
