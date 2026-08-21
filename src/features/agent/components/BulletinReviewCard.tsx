'use client'

import { useState } from 'react'
import { Copy, FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/shared/ToastProvider'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'

interface BulletinReviewCardProps {
  subject: string
  grade: string
  initialComment: string
}

const LABELS = {
  fr: {
    title: 'Commentaire de bulletin',
    hint: 'Déjà enregistré dans votre historique de bulletins — relisez et ajustez avant de l’utiliser.',
    subject: 'Matière',
    grade: 'Note / appréciation',
    comment: 'Commentaire',
    copy: 'Copier',
    copied: 'Commentaire copié.',
  },
  en: {
    title: 'Report card comment',
    hint: 'Already saved to your bulletin history — review and adjust before using it.',
    subject: 'Subject',
    grade: 'Grade / appreciation',
    comment: 'Comment',
    copy: 'Copy',
    copied: 'Comment copied.',
  },
  es: {
    title: 'Comentario de boletín',
    hint: 'Ya guardado en tu historial de boletines — revísalo y ajústalo antes de usarlo.',
    subject: 'Materia',
    grade: 'Nota / apreciación',
    comment: 'Comentario',
    copy: 'Copiar',
    copied: 'Comentario copiado.',
  },
} as const

export default function BulletinReviewCard({
  subject,
  grade,
  initialComment,
}: BulletinReviewCardProps) {
  const { showToast } = useToast()
  const { locale } = useAppLocale()
  const labels = LABELS[locale]
  const [comment, setComment] = useState(initialComment)

  async function handleCopy() {
    await navigator.clipboard.writeText(comment)
    showToast(labels.copied, 'success')
  }

  return (
    <div className="w-full space-y-4 rounded-2xl border border-primary/20 bg-card p-4 text-foreground shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {labels.title}
            </p>
            <p className="text-xs text-muted-foreground">{labels.hint}</p>
          </div>
        </div>
        <Button type="button" size="sm" onClick={() => void handleCopy()}>
          <Copy size={15} /> {labels.copy}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{labels.subject}</Label>
          <p className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
            {subject}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>{labels.grade}</Label>
          <p className="rounded-lg border border-input bg-background px-3 py-2 text-sm">{grade}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bulletin-comment">{labels.comment}</Label>
        <textarea
          id="bulletin-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
    </div>
  )
}
