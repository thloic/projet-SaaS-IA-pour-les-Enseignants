'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/shared/ToastProvider'
import { PATSchema, type PAT } from '@/features/agent/schemas/patSchema'

interface PATReviewCardProps {
  initialPAT: PAT
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
}: {
  id: string
  label: string
  value: string[]
  onChange: (value: string[]) => void
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
      <p className="text-[11px] text-muted-foreground">Une entrée par ligne.</p>
    </div>
  )
}

export default function PATReviewCard({ initialPAT }: PATReviewCardProps) {
  const { showToast } = useToast()
  const [pat, setPAT] = useState<PAT>(() => structuredClone(initialPAT))
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    const parsed = PATSchema.safeParse(pat)
    if (!parsed.success) {
      showToast('Vérifiez les champs du PAT avant de l’exporter.', 'error')
      return
    }

    try {
      setIsExporting(true)
      const response = await fetch('/api/agent/pat/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? 'L’export DOCX a échoué.')
      }

      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = 'plan-appui-temporaire.docx'
      link.click()
      URL.revokeObjectURL(url)
      showToast('Le PAT a été exporté en DOCX.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'L’export DOCX a échoué.'
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
            Plan d’appui temporaire
          </p>
          <p className="text-xs text-muted-foreground">
            Relisez et ajustez le document avant l’export.
          </p>
        </div>
        <Button type="button" size="sm" onClick={handleExport} disabled={isExporting}>
          {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          Exporter DOCX
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pat-student-name">Élève</Label>
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
          <Label htmlFor="pat-student-level">Niveau</Label>
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
        <Label htmlFor="pat-student-profile">Profil</Label>
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
          label="Forces"
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
          label="Besoins / axes de progrès"
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
        <p className="text-sm font-semibold">Comportements et habiletés ciblés</p>
        {pat.comportementsCibles.map((target, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
            <Input
              aria-label={`Date ${index + 1}`}
              placeholder="Date (facultative)"
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
              placeholder="Habileté ciblée"
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
              placeholder="Interventions prévues"
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
              placeholder="Preuves de progression (facultatives)"
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
          label="Modalités d’appui"
          value={pat.modalitesAppui}
          onChange={(modalitesAppui) => setPAT((current) => ({ ...current, modalitesAppui }))}
        />
        <ListEditor
          id="pat-adaptations"
          label="Adaptations offertes"
          value={pat.adaptationsOffertes}
          onChange={(adaptationsOffertes) =>
            setPAT((current) => ({ ...current, adaptationsOffertes }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pat-recommendations">Recommandations PSAC</Label>
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
          <p className="text-sm font-semibold">Francisation</p>
          {(['communicationOrale', 'lecture', 'ecriture'] as const).map((field) => (
            <div key={field} className="space-y-1.5">
              <Label htmlFor={`pat-${field}`}>
                {field === 'communicationOrale'
                  ? 'Communication orale'
                  : field === 'lecture'
                    ? 'Lecture'
                    : 'Écriture'}
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
            label="Axes de progrès en francisation"
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
