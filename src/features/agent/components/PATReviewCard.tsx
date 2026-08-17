'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/shared/ToastProvider'
import { PATSchema, type PAT } from '@/features/agent/schemas/patSchema'
import type { ContentLanguage } from '@/features/i18n/locale'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import { patTranslations } from '@/features/agent/i18n/patTranslations'

interface PATReviewCardProps {
  initialPAT: PAT
  documentLanguage: ContentLanguage
}

function textList(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function ListEditor({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string
  label: string
  value: string[]
  onChange: (value: string[]) => void
  hint: string
}) {
  const [text, setText] = useState(() => value.join('\n'))

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => onChange(textList(text))}
        className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}

export default function PATReviewCard({ initialPAT, documentLanguage }: PATReviewCardProps) {
  const { showToast } = useToast()
  const { locale } = useAppLocale()
  const labels = patTranslations[locale]
  const [pat, setPAT] = useState<PAT>(() => structuredClone(initialPAT))
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    const parsed = PATSchema.safeParse(pat)
    if (!parsed.success) {
      showToast(labels.invalid, 'error')
      return
    }

    try {
      setIsExporting(true)
      const response = await fetch('/api/agent/pat/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pat: parsed.data, language: documentLanguage }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? labels.exportFailed)
      }

      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = 'plan-appui-temporaire.docx'
      link.click()
      URL.revokeObjectURL(url)
      showToast(labels.exported, 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : labels.exportFailed
      showToast(message, 'error')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="w-full space-y-5 rounded-2xl border border-primary/20 bg-card p-4 text-foreground shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {labels.shortTitle}
          </p>
          <p className="text-xs text-muted-foreground">
            {labels.reviewHint}
          </p>
        </div>
        <Button type="button" size="sm" onClick={handleExport} disabled={isExporting}>
          {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {labels.export}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pat-student-name">{labels.student}</Label>
          <Input
            id="pat-student-name"
            value={pat.eleve.nom}
            onChange={(event) =>
              setPAT((current) => ({
                ...current,
                eleve: { ...current.eleve, nom: event.target.value },
              }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pat-student-level">{labels.level}</Label>
          <Input
            id="pat-student-level"
            value={pat.eleve.niveau ?? ''}
            onChange={(event) =>
              setPAT((current) => ({
                ...current,
                eleve: { ...current.eleve, niveau: event.target.value || undefined },
              }))
            }
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pat-student-profile">{labels.profile}</Label>
        <textarea
          id="pat-student-profile"
          value={pat.eleve.profil ?? ''}
          onChange={(event) =>
            setPAT((current) => ({
              ...current,
              eleve: { ...current.eleve, profil: event.target.value || undefined },
            }))
          }
          className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ListEditor
          id="pat-strengths"
          label={labels.strengths}
          hint={labels.onePerLine}
          value={pat.habiletes.forces}
          onChange={(forces) =>
            setPAT((current) => ({
              ...current,
              habiletes: { ...current.habiletes, forces },
            }))
          }
        />
        <ListEditor
          id="pat-needs"
          label={labels.needs}
          hint={labels.onePerLine}
          value={pat.habiletes.besoins}
          onChange={(besoins) =>
            setPAT((current) => ({
              ...current,
              habiletes: { ...current.habiletes, besoins },
            }))
          }
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">{labels.targets}</p>
        {pat.comportementsCibles.map((target, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
            <Input
              aria-label={`Date ${index + 1}`}
              placeholder={labels.dateOptional}
              value={target.date ?? ''}
              onChange={(event) =>
                setPAT((current) => ({
                  ...current,
                  comportementsCibles: current.comportementsCibles.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, date: event.target.value || undefined }
                      : item
                  ),
                }))
              }
            />
            <Input
              aria-label={`Habileté ${index + 1}`}
              placeholder={labels.skill}
              value={target.habilete}
              onChange={(event) =>
                setPAT((current) => ({
                  ...current,
                  comportementsCibles: current.comportementsCibles.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, habilete: event.target.value } : item
                  ),
                }))
              }
            />
            <textarea
              aria-label={`Interventions ${index + 1}`}
              placeholder={labels.interventions}
              value={target.interventionsPrevues}
              onChange={(event) =>
                setPAT((current) => ({
                  ...current,
                  comportementsCibles: current.comportementsCibles.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, interventionsPrevues: event.target.value }
                      : item
                  ),
                }))
              }
              className="min-h-20 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <textarea
              aria-label={`Preuves ${index + 1}`}
              placeholder={labels.evidenceOptional}
              value={target.preuvesProgression ?? ''}
              onChange={(event) =>
                setPAT((current) => ({
                  ...current,
                  comportementsCibles: current.comportementsCibles.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, preuvesProgression: event.target.value || undefined }
                      : item
                  ),
                }))
              }
              className="min-h-20 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ListEditor
          id="pat-support"
          label={labels.support}
          hint={labels.onePerLine}
          value={pat.modalitesAppui}
          onChange={(modalitesAppui) => setPAT((current) => ({ ...current, modalitesAppui }))}
        />
        <ListEditor
          id="pat-adaptations"
          label={labels.adaptations}
          hint={labels.onePerLine}
          value={pat.adaptationsOffertes}
          onChange={(adaptationsOffertes) =>
            setPAT((current) => ({ ...current, adaptationsOffertes }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pat-recommendations">{labels.recommendations}</Label>
        <textarea
          id="pat-recommendations"
          value={pat.recommandationsPSAC ?? ''}
          onChange={(event) =>
            setPAT((current) => ({
              ...current,
              recommandationsPSAC: event.target.value || undefined,
            }))
          }
          className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {pat.francisation && (
        <div className="space-y-3 rounded-xl border border-border p-3">
          <p className="text-sm font-semibold">{labels.francisation}</p>
          {(['communicationOrale', 'lecture', 'ecriture'] as const).map((field) => (
            <div key={field} className="space-y-1.5">
              <Label htmlFor={`pat-${field}`}>
                {field === 'communicationOrale'
                  ? labels.oral
                  : field === 'lecture'
                    ? labels.reading
                    : labels.writing}
              </Label>
              <textarea
                id={`pat-${field}`}
                value={pat.francisation?.[field] ?? ''}
                onChange={(event) =>
                  setPAT((current) => ({
                    ...current,
                    francisation: current.francisation
                      ? {
                          ...current.francisation,
                          [field]: event.target.value || undefined,
                        }
                      : undefined,
                  }))
                }
                className="min-h-16 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
          <ListEditor
            id="pat-francisation-needs"
            label={labels.francisationNeeds}
            hint={labels.onePerLine}
            value={pat.francisation.besoins ?? []}
            onChange={(besoins) =>
              setPAT((current) => ({
                ...current,
                francisation: current.francisation
                  ? { ...current.francisation, besoins }
                  : undefined,
              }))
            }
          />
        </div>
      )}
    </div>
  )
}
