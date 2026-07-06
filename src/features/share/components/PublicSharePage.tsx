'use client'

import { FileText } from 'lucide-react'
import PublicPageShell from '@/features/marketing/components/PublicPageShell'
import { usePublicLocale } from '@/features/marketing/hooks/usePublicLocale'

export default function PublicSharePage() {
  const { locale, setLocale } = usePublicLocale()

  return (
    <PublicPageShell
      locale={locale}
      onLocaleChange={setLocale}
      eyebrow={locale === 'en' ? 'SHARED DOCUMENT' : 'DOCUMENT PARTAGÉ'}
      title={locale === 'en' ? 'Shared content will appear here.' : 'Le contenu partagé apparaîtra ici.'}
      description={
        locale === 'en'
          ? 'This public sharing page is ready for the upcoming document-sharing workflow.'
          : 'Cette page publique est prête pour le futur parcours de partage de documents.'
      }
    >
      <div className="flex min-h-56 items-center justify-center rounded-3xl border border-[#534AB7]/15 bg-white/70 dark:border-white/10 dark:bg-white/[0.035]">
        <FileText size={42} className="text-[#7F77DD]" />
      </div>
    </PublicPageShell>
  )
}
