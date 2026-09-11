import { AlertTriangle } from 'lucide-react'
import type { PublicLocale } from '@/features/marketing/hooks/usePublicLocale'

const COPY = {
  en: {
    title: 'Draft — pending legal review',
    body: 'This document is a working draft prepared to reflect how EducAssist actually operates today. It has not been reviewed by a lawyer and must not be treated as a final, binding version until qualified legal counsel (Québec law, Law 25) has reviewed and approved it. Bracketed items still need to be filled in by the business owner.',
  },
  fr: {
    title: 'Brouillon — en attente de relecture juridique',
    body: 'Ce document est un brouillon de travail rédigé pour refléter fidèlement le fonctionnement réel d’EducAssist. Il n’a pas été relu par un avocat et ne doit pas être considéré comme une version finale et opposable tant qu’un conseiller juridique qualifié (droit québécois, Loi 25) ne l’a pas révisé et approuvé. Les mentions entre crochets restent à compléter par le propriétaire de l’entreprise.',
  },
  es: {
    title: 'Borrador — pendiente de revisión legal',
    body: 'Este documento es un borrador de trabajo redactado para reflejar fielmente el funcionamiento real de EducAssist. No ha sido revisado por un abogado y no debe considerarse una versión final y vinculante hasta que un asesor jurídico calificado (derecho de Quebec, Ley 25) lo haya revisado y aprobado. Los elementos entre corchetes siguen pendientes de ser completados por el propietario del negocio.',
  },
} as const

export default function LegalDraftNotice({ locale }: { locale: PublicLocale }) {
  const t = COPY[locale]
  return (
    <div className="mb-10 flex gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5">
      <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-500" />
      <div>
        <p className="font-bold text-amber-600 dark:text-amber-400">{t.title}</p>
        <p className="mt-1 text-sm leading-6 text-amber-700/90 dark:text-amber-300/80">{t.body}</p>
      </div>
    </div>
  )
}
