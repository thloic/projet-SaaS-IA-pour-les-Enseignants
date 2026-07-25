'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  FileText,
  History,
  MessageSquare,
  Search,
  UsersRound,
  WandSparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import type {
  DashboardHistoryItem,
  DashboardHistoryType,
} from '@/features/dashboard/types/dashboard.types'

const TYPE_ICONS = {
  course: BookOpen,
  quiz: ClipboardList,
  adaptation: WandSparkles,
  bulletin: MessageSquare,
  correction: CheckCheck,
  document: FileText,
  session: UsersRound,
} satisfies Record<DashboardHistoryType, typeof History>

const TYPE_LABELS: Record<DashboardHistoryType, { fr: string; en: string }> = {
  course: { fr: 'Cours', en: 'Lesson' },
  quiz: { fr: 'Quiz', en: 'Quiz' },
  adaptation: { fr: 'Adaptation', en: 'Adaptation' },
  bulletin: { fr: 'Bulletin', en: 'Report' },
  correction: { fr: 'Correction', en: 'Grading' },
  document: { fr: 'Document', en: 'Document' },
  session: { fr: 'Séance', en: 'Session' },
}

interface UnifiedHistoryProps {
  items: DashboardHistoryItem[]
  compact?: boolean
}

function dayGroup(value: string, locale: 'en' | 'fr') {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const key = date.toISOString().slice(0, 10)
  if (key === today.toISOString().slice(0, 10)) return locale === 'fr' ? 'Aujourd’hui' : 'Today'
  if (key === yesterday.toISOString().slice(0, 10)) return locale === 'fr' ? 'Hier' : 'Yesterday'
  return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function statusClass(status: DashboardHistoryItem['status']) {
  if (status === 'failed') return 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
  if (status === 'generating') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  }
  if (status === 'complete') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  }
  return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
}

export default function UnifiedHistory({ items, compact = false }: UnifiedHistoryProps) {
  const { locale } = useAppLocale()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | DashboardHistoryType>('all')
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale)
    return items.filter((item) => {
      const matchesType = type === 'all' || item.type === type
      const matchesQuery =
        !normalized ||
        `${item.title} ${item.subtitle} ${TYPE_LABELS[item.type][locale]}`
          .toLocaleLowerCase(locale)
          .includes(normalized)
      return matchesType && matchesQuery
    })
  }, [items, locale, query, type])
  const visible = compact ? filtered.slice(0, 7) : filtered
  const grouped = visible.reduce<Array<{ label: string; items: DashboardHistoryItem[] }>>(
    (groups, item) => {
      const label = dayGroup(item.createdAt, locale)
      const current = groups.at(-1)
      if (current?.label === label) current.items.push(item)
      else groups.push({ label, items: [item] })
      return groups
    },
    []
  )

  return (
    <section className="min-w-0">
      {!compact && (
        <div className="mb-5 space-y-3">
          <div className="relative max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={locale === 'fr' ? 'Rechercher dans l’historique...' : 'Search history...'}
              className="min-h-10 pl-9"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setType('all')}
              className={`min-h-9 shrink-0 rounded-md border px-3 text-xs font-semibold ${
                type === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border'
              }`}
            >
              {locale === 'fr' ? 'Tout' : 'All'}
            </button>
            {(Object.keys(TYPE_LABELS) as DashboardHistoryType[]).map((itemType) => (
              <button
                key={itemType}
                type="button"
                onClick={() => setType(itemType)}
                className={`min-h-9 shrink-0 rounded-md border px-3 text-xs font-semibold ${
                  type === itemType
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border'
                }`}
              >
                {TYPE_LABELS[itemType][locale]}
              </button>
            ))}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          {locale === 'fr'
            ? 'Aucune activité ne correspond à cette période.'
            : 'No activity matches this period.'}
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">{group.label}</p>
              <div className="overflow-hidden rounded-lg border border-border">
                {group.items.map((item) => {
                  const Icon = TYPE_ICONS[item.type]
                  return (
                    <div
                      key={item.id}
                      className="flex min-w-0 items-center gap-3 border-b border-border px-3 py-3 last:border-0 sm:px-4"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {TYPE_LABELS[item.type][locale]} · {item.subtitle} ·{' '}
                          {new Date(item.createdAt).toLocaleTimeString(
                            locale === 'fr' ? 'fr-FR' : 'en-US',
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </p>
                      </div>
                      <Badge variant="outline" className={`hidden text-[10px] sm:flex ${statusClass(item.status)}`}>
                        {item.status === 'failed'
                          ? locale === 'fr'
                            ? 'À vérifier'
                            : 'Check'
                          : item.status === 'generating'
                            ? locale === 'fr'
                              ? 'En cours'
                              : 'In progress'
                            : item.status === 'complete'
                              ? locale === 'fr'
                                ? 'Terminé'
                                : 'Complete'
                              : locale === 'fr'
                                ? 'Ajouté'
                                : 'Added'}
                      </Badge>
                      <Button asChild size="icon" variant="ghost">
                        <Link
                          href={item.href}
                          aria-label={`${locale === 'fr' ? 'Ouvrir' : 'Open'} ${item.title}`}
                        >
                          <ChevronRight />
                        </Link>
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
