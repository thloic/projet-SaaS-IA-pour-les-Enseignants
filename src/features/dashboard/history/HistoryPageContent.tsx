'use client'

import Link from 'next/link'
import { FileText, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DashboardPeriodFilter from '@/features/dashboard/components/DashboardPeriodFilter'
import UnifiedHistory from '@/features/dashboard/history/UnifiedHistory'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import type { CentralDashboardData } from '@/features/dashboard/types/dashboard.types'

export default function HistoryPageContent({ data }: { data: CentralDashboardData }) {
  const { locale } = useAppLocale()
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-24 lg:pb-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <History size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">
              {locale === 'fr' ? 'Historique' : 'History'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {locale === 'fr'
                ? 'Cours, quiz, adaptations, bulletins, corrections, documents et séances.'
                : 'Lessons, quizzes, adaptations, reports, grading, documents and sessions.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/history/documents"><FileText /> {locale === 'fr' ? 'Documents générés' : locale === 'es' ? 'Documentos generados' : 'Generated documents'}</Link>
          </Button>
          <DashboardPeriodFilter period={data.period} basePath="/history" />
        </div>
      </header>
      <UnifiedHistory items={data.history} />
    </div>
  )
}
