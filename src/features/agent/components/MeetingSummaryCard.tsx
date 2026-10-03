'use client'

import { useState } from 'react'
import { Copy, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/shared/ToastProvider'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'

interface MeetingSummaryCardProps {
  initialSubjectsDiscussed: string[]
  initialAgreementsReached: string[]
  initialNextSteps: string[]
}

const LABELS = {
  fr: {
    title: 'Compte rendu de rencontre parent',
    hint: 'Brouillon enregistré dans votre historique — relisez et ajustez avant de l’archiver.',
    subjects: 'Sujets abordés',
    agreements: 'Points convenus',
    nextSteps: 'Prochaines étapes',
    copy: 'Copier le compte rendu',
    copied: 'Compte rendu copié.',
  },
  en: {
    title: 'Parent meeting summary',
    hint: 'Draft saved to your history — review and adjust before archiving it.',
    subjects: 'Subjects discussed',
    agreements: 'Agreements reached',
    nextSteps: 'Next steps',
    copy: 'Copy summary',
    copied: 'Summary copied.',
  },
  es: {
    title: 'Resumen de reunión con los padres',
    hint: 'Borrador guardado en tu historial — revísalo y ajústalo antes de archivarlo.',
    subjects: 'Temas abordados',
    agreements: 'Acuerdos alcanzados',
    nextSteps: 'Próximos pasos',
    copy: 'Copiar resumen',
    copied: 'Resumen copiado.',
  },
} as const

function toLines(items: string[]): string {
  return items.join('\n')
}

function fromLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export default function MeetingSummaryCard({
  initialSubjectsDiscussed,
  initialAgreementsReached,
  initialNextSteps,
}: MeetingSummaryCardProps) {
  const { showToast } = useToast()
  const { locale } = useAppLocale()
  const labels = LABELS[locale]
  const [subjects, setSubjects] = useState(toLines(initialSubjectsDiscussed))
  const [agreements, setAgreements] = useState(toLines(initialAgreementsReached))
  const [nextSteps, setNextSteps] = useState(toLines(initialNextSteps))

  async function handleCopy() {
    const text = [
      `${labels.subjects} :`,
      ...fromLines(subjects).map((line) => `- ${line}`),
      '',
      `${labels.agreements} :`,
      ...fromLines(agreements).map((line) => `- ${line}`),
      '',
      `${labels.nextSteps} :`,
      ...fromLines(nextSteps).map((line) => `- ${line}`),
    ].join('\n')
    await navigator.clipboard.writeText(text)
    showToast(labels.copied, 'success')
  }

  return (
    <div className="w-full space-y-4 rounded-2xl border border-primary/20 bg-card p-4 text-foreground shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{labels.title}</p>
            <p className="text-xs text-muted-foreground">{labels.hint}</p>
          </div>
        </div>
        <Button type="button" size="sm" onClick={() => void handleCopy()}>
          <Copy size={15} /> {labels.copy}
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meeting-summary-subjects">{labels.subjects}</Label>
        <textarea
          id="meeting-summary-subjects"
          value={subjects}
          onChange={(event) => setSubjects(event.target.value)}
          className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meeting-summary-agreements">{labels.agreements}</Label>
        <textarea
          id="meeting-summary-agreements"
          value={agreements}
          onChange={(event) => setAgreements(event.target.value)}
          className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meeting-summary-next-steps">{labels.nextSteps}</Label>
        <textarea
          id="meeting-summary-next-steps"
          value={nextSteps}
          onChange={(event) => setNextSteps(event.target.value)}
          className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
    </div>
  )
}
