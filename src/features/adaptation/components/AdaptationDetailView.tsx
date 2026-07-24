'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Link2,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Share2,
  ShieldOff,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/shared/ToastProvider'
import ExportButton from '@/features/export/components/ExportButton'
import AdaptationContent from '@/features/adaptation/components/AdaptationContent'
import {
  createAdaptationShareAction,
  regenerateVariantAction,
  revokeAdaptationSharesAction,
  updateVariantAction,
} from '@/features/adaptation/server/adaptation.actions'
import type { VariantType } from '@/features/adaptation/schemas/adaptationSchema'
import type { AdaptationDetail } from '@/features/adaptation/types/adaptation.types'

const VARIANT_META: Record<VariantType, { label: string; short: string }> = {
  standard: { label: 'Standard', short: 'Version optimisée' },
  support: { label: 'Soutien', short: 'Étapes guidées' },
  dys: { label: 'DYS', short: 'Lecture facilitée' },
  adhd: { label: 'TDAH', short: 'Micro-étapes' },
  enrichment: { label: 'Enrichissement', short: 'Approfondissement' },
}

interface AdaptationDetailViewProps {
  adaptation: AdaptationDetail
}

export default function AdaptationDetailView({ adaptation }: AdaptationDetailViewProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const firstAvailable =
    adaptation.variants.find((variant) => variant.status === 'complete')?.variant_type ??
    adaptation.variants[0]?.variant_type ??
    'standard'
  const [activeType, setActiveType] = useState<VariantType>(firstAvailable)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const activeVariant = adaptation.variants.find(
    (variant) => variant.variant_type === activeType
  )

  function startEditing() {
    setDraft(activeVariant?.content_md ?? '')
    setEditing(true)
  }

  async function saveChanges() {
    if (!activeVariant) return
    setIsSaving(true)
    const result = await updateVariantAction(activeVariant.id, draft)
    setIsSaving(false)
    if (result.error) {
      showToast(result.error, 'error')
      return
    }
    setEditing(false)
    showToast('Modifications enregistrées.', 'success')
    router.refresh()
  }

  async function regenerate() {
    setIsRegenerating(true)
    const result = await regenerateVariantAction(adaptation.id, activeType)
    setIsRegenerating(false)
    if (result.error) {
      showToast(result.error, 'error')
      return
    }
    showToast(`${VARIANT_META[activeType].label} régénérée.`, 'success')
    router.refresh()
  }

  async function copyContent() {
    if (!activeVariant?.content_md) return
    await navigator.clipboard.writeText(activeVariant.content_md)
    showToast('Contenu copié.', 'success')
  }

  async function share(onlyCurrentVariant: boolean) {
    setIsSharing(true)
    const result = await createAdaptationShareAction(
      adaptation.id,
      onlyCurrentVariant ? activeType : null,
      30
    )
    setIsSharing(false)
    if (result.error || !result.sharePath) {
      showToast(result.error ?? 'Le partage a échoué.', 'error')
      return
    }
    await navigator.clipboard.writeText(`${window.location.origin}${result.sharePath}`)
    showToast('Lien valable 30 jours copié.', 'success')
  }

  async function revokeShares() {
    const result = await revokeAdaptationSharesAction(adaptation.id)
    showToast(
      result.error ?? 'Tous les liens actifs ont été désactivés.',
      result.error ? 'error' : 'success'
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24 lg:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href="/adaptations"><ArrowLeft /> Banque</Link>
        </Button>
        <Button asChild>
          <Link href="/adaptations/new"><Sparkles /> Nouvelle adaptation</Link>
        </Button>
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{adaptation.subject}</Badge>
          <Badge variant="outline">{adaptation.level}</Badge>
          <Badge variant="outline">
            {adaptation.status === 'complete'
              ? '5 variantes prêtes'
              : adaptation.status === 'partial'
                ? 'Génération partielle'
                : adaptation.status === 'generating'
                  ? 'Génération en cours'
                  : 'Échec'}
          </Badge>
        </div>
        <h1 className="break-words text-2xl font-black sm:text-3xl">{adaptation.title}</h1>
        {adaptation.students.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <UsersRound size={16} />
            {adaptation.students.length} élève(s) ciblé(s)
            {Array.from(new Set(adaptation.students.map((student) => student.suggestedVariant))).map(
              (type) => <Badge key={type} variant="secondary">{VARIANT_META[type].label}</Badge>
            )}
          </div>
        )}
      </header>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {adaptation.variants.map((variant) => {
            const active = variant.variant_type === activeType
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => {
                  setActiveType(variant.variant_type)
                  setEditing(false)
                }}
                className={`flex min-h-14 min-w-36 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                  active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/40'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{VARIANT_META[variant.variant_type].label}</span>
                  <span className="block text-xs opacity-75">
                    {variant.status === 'complete'
                      ? VARIANT_META[variant.variant_type].short
                      : variant.status === 'failed'
                        ? 'À relancer'
                        : 'En cours'}
                  </span>
                </span>
                {variant.status === 'complete' && <Check size={15} className="ml-auto shrink-0" />}
                {variant.status === 'failed' && <AlertCircle size={15} className="ml-auto shrink-0 text-rose-500" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <article className="min-h-[500px] rounded-xl border border-border bg-card/50 p-4 sm:p-7">
          {!activeVariant || activeVariant.status !== 'complete' ? (
            <div className="flex min-h-96 flex-col items-center justify-center text-center">
              <AlertCircle className="mb-3 text-amber-500" size={28} />
              <h2 className="font-bold">Cette variante n’est pas disponible</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Relancez uniquement cette version. Les autres variantes resteront inchangées.
              </p>
              <Button className="mt-5" onClick={() => void regenerate()} disabled={isRegenerating}>
                {isRegenerating ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                Relancer
              </Button>
            </div>
          ) : editing ? (
            <div className="space-y-4">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={24}
                className="w-full resize-y rounded-lg border border-input bg-background px-3 py-3 font-mono text-sm leading-6 outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  <X /> Annuler
                </Button>
                <Button onClick={() => void saveChanges()} disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                  Enregistrer
                </Button>
              </div>
            </div>
          ) : (
            <AdaptationContent
              content={activeVariant.content_md}
              variantType={activeVariant.variant_type}
            />
          )}
        </article>

        <aside className="space-y-3 xl:sticky xl:top-6 xl:self-start">
          <div className="space-y-2 rounded-xl border border-border bg-card/50 p-3">
            <p className="px-1 text-xs font-bold uppercase text-muted-foreground">Actions</p>
            <Button
              variant="outline"
              className="min-h-10 w-full justify-start"
              onClick={startEditing}
              disabled={activeVariant?.status !== 'complete' || editing}
            >
              <Pencil /> Modifier
            </Button>
            <Button
              variant="outline"
              className="min-h-10 w-full justify-start"
              onClick={() => void copyContent()}
              disabled={activeVariant?.status !== 'complete'}
            >
              <Copy /> Copier
            </Button>
            <Button
              variant="outline"
              className="min-h-10 w-full justify-start"
              onClick={() => void regenerate()}
              disabled={isRegenerating}
            >
              {isRegenerating ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Régénérer cette version
            </Button>
            <ExportButton
              source="adaptation_variant"
              sourceId={adaptation.id}
              variantType={activeType}
              disabled={activeVariant?.status !== 'complete'}
            />
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-card/50 p-3">
            <p className="px-1 text-xs font-bold uppercase text-muted-foreground">Partage sécurisé</p>
            <Button
              variant="outline"
              className="min-h-10 w-full justify-start"
              disabled={isSharing || activeVariant?.status !== 'complete'}
              onClick={() => void share(true)}
            >
              {isSharing ? <Loader2 className="animate-spin" /> : <Link2 />}
              Partager cette version
            </Button>
            <Button
              variant="outline"
              className="min-h-10 w-full justify-start"
              disabled={isSharing}
              onClick={() => void share(false)}
            >
              <Share2 /> Partager les variantes
            </Button>
            <Button
              variant="ghost"
              className="min-h-10 w-full justify-start text-muted-foreground"
              onClick={() => void revokeShares()}
            >
              <ShieldOff /> Désactiver les liens
            </Button>
            <p className="px-1 text-xs text-muted-foreground">
              Les liens expirent après 30 jours et ne contiennent aucune donnée élève.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
