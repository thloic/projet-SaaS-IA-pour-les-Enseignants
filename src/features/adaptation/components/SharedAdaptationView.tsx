'use client'

import { useState } from 'react'
import { BookOpenCheck, Copy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import AdaptationContent from '@/features/adaptation/components/AdaptationContent'
import type { VariantType } from '@/features/adaptation/schemas/adaptationSchema'
import type { SharedAdaptation } from '@/features/adaptation/types/adaptation.types'

const LABELS: Record<VariantType, string> = {
  standard: 'Standard',
  support: 'Soutien',
  dys: 'DYS',
  adhd: 'TDAH',
  enrichment: 'Enrichissement',
}

export default function SharedAdaptationView({ adaptation }: { adaptation: SharedAdaptation }) {
  const [activeType, setActiveType] = useState<VariantType>(
    adaptation.variants[0]?.variant_type ?? 'standard'
  )
  const active = adaptation.variants.find((variant) => variant.variant_type === activeType)

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-4 border-b border-border pb-6">
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <BookOpenCheck size={18} /> EducAssist
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{adaptation.subject}</Badge>
            <Badge variant="outline">{adaptation.level}</Badge>
            <Badge variant="outline">Ressource partagée</Badge>
          </div>
          <h1 className="break-words text-2xl font-black sm:text-3xl">{adaptation.title}</h1>
        </header>

        {adaptation.variants.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {adaptation.variants.map((variant) => (
              <button
                key={variant.variant_type}
                type="button"
                onClick={() => setActiveType(variant.variant_type)}
                className={`min-h-10 shrink-0 rounded-lg border px-4 text-sm font-semibold ${
                  activeType === variant.variant_type
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border'
                }`}
              >
                {LABELS[variant.variant_type]}
              </button>
            ))}
          </div>
        )}

        {active && (
          <article className="rounded-xl border border-border bg-card p-4 sm:p-7">
            <div className="mb-5 flex justify-end">
              <Button
                variant="outline"
                onClick={() => void navigator.clipboard.writeText(active.content_md)}
              >
                <Copy /> Copier
              </Button>
            </div>
            <AdaptationContent content={active.content_md} variantType={active.variant_type} />
          </article>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Ce lien ne contient aucune donnée personnelle d’élève.
        </p>
      </div>
    </main>
  )
}
