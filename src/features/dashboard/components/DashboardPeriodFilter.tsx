'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarRange } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import type { DashboardPeriod } from '@/features/dashboard/types/dashboard.types'

interface DashboardPeriodFilterProps {
  period: DashboardPeriod
  basePath: '/dashboard' | '/history'
}

export default function DashboardPeriodFilter({
  period,
  basePath,
}: DashboardPeriodFilterProps) {
  const router = useRouter()
  const { locale } = useAppLocale()
  const [customOpen, setCustomOpen] = useState(period.preset === 'custom')
  const [from, setFrom] = useState(period.from)
  const [to, setTo] = useState(period.to)

  function selectPreset(preset: '7d' | '30d' | '90d') {
    setCustomOpen(false)
    router.push(`${basePath}?preset=${preset}`, { scroll: false })
  }

  function applyCustom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    router.push(`${basePath}?preset=custom&from=${from}&to=${to}`, { scroll: false })
  }

  return (
    <div className="flex w-full flex-col gap-2 lg:w-auto lg:items-end">
      <div className="flex w-full gap-1 overflow-x-auto lg:w-auto">
        {[
          ['7d', locale === 'fr' ? '7 jours' : '7 days'],
          ['30d', locale === 'fr' ? '30 jours' : '30 days'],
          ['90d', locale === 'fr' ? '90 jours' : '90 days'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => selectPreset(value as '7d' | '30d' | '90d')}
            className={`min-h-9 shrink-0 rounded-md border px-3 text-xs font-semibold transition-colors ${
              period.preset === value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted/40'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((current) => !current)}
          className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors ${
            period.preset === 'custom'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:bg-muted/40'
          }`}
        >
          <CalendarRange size={14} /> {locale === 'fr' ? 'Personnalisée' : 'Custom'}
        </button>
      </div>
      {customOpen && (
        <form
          onSubmit={applyCustom}
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2 shadow-sm sm:flex-row sm:items-end"
        >
          <label className="text-[11px] font-semibold text-muted-foreground">
            {locale === 'fr' ? 'Du' : 'From'}
            <input
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1 block min-h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>
          <label className="text-[11px] font-semibold text-muted-foreground">
            {locale === 'fr' ? 'Au' : 'To'}
            <input
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
              className="mt-1 block min-h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>
          <Button type="submit" size="sm" className="min-h-9">
            {locale === 'fr' ? 'Appliquer' : 'Apply'}
          </Button>
        </form>
      )}
    </div>
  )
}
