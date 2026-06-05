'use client'

import { useState, useMemo } from 'react'
import { History, Eye, Download, Share2, Search, BookOpen, ClipboardList, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const BRAND = '#534AB7'

type EntryType = 'course' | 'quiz' | 'bulletin'

interface HistoryEntry {
  id: string
  type: EntryType
  title: string
  subject: string
  level: string
  date: string
  words?: number
}

const mockHistory: HistoryEntry[] = [
  { id: '1', type: 'course',   title: 'Théorème de Pythagore',          subject: 'Maths',          level: '3ème',  date: '25 juil. 2025',  words: 1240 },
  { id: '2', type: 'quiz',     title: 'Quiz — Pythagore (8 questions)',  subject: 'Maths',          level: '3ème',  date: '25 juil. 2025' },
  { id: '3', type: 'course',   title: 'La Révolution française',         subject: 'Histoire',       level: '4ème',  date: '24 juil. 2025',  words: 1680 },
  { id: '4', type: 'bulletin', title: 'Commentaire — Amara K.',         subject: 'Maths',          level: '3ème',  date: '23 juil. 2025' },
  { id: '5', type: 'course',   title: 'Analyse de texte narratif',       subject: 'Français',       level: '5ème',  date: '22 juil. 2025',  words: 980 },
  { id: '6', type: 'quiz',     title: 'Quiz — Révolution française',     subject: 'Histoire',       level: '4ème',  date: '22 juil. 2025' },
  { id: '7', type: 'course',   title: 'Écosystèmes & biodiversité',      subject: 'SVT',            level: '6ème',  date: '20 juil. 2025',  words: 1100 },
  { id: '8', type: 'bulletin', title: 'Commentaire — Moussa D.',         subject: 'Français',       level: '5ème',  date: '19 juil. 2025' },
  { id: '9', type: 'course',   title: 'Les fonctions affines',           subject: 'Maths',          level: '3ème',  date: '18 juil. 2025',  words: 1050 },
  { id: '10',type: 'course',   title: 'Introduction à la photosynthèse', subject: 'SVT',            level: '4ème',  date: '17 juil. 2025',  words: 870 },
]

const TYPE_LABELS: Record<EntryType, { label: string; icon: React.ElementType; class: string }> = {
  course:   { label: 'Cours',    icon: BookOpen,      class: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  quiz:     { label: 'Quiz',     icon: ClipboardList, class: 'bg-teal-500/20 text-teal-300 border-teal-500/30'       },
  bulletin: { label: 'Bulletin', icon: MessageSquare, class: 'bg-amber-500/20 text-amber-300 border-amber-500/30'   },
}

const ALL_SUBJECTS = ['Tous', ...Array.from(new Set(mockHistory.map((e) => e.subject)))]

export default function HistoryPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<EntryType | 'all'>('all')
  const [subjectFilter, setSubjectFilter] = useState('Tous')

  const filtered = useMemo(() => {
    return mockHistory.filter((e) => {
      const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) || e.subject.toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === 'all' || e.type === typeFilter
      const matchSubject = subjectFilter === 'Tous' || e.subject === subjectFilter
      return matchSearch && matchType && matchSubject
    })
  }, [search, typeFilter, subjectFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-muted/40">
          <History size={22} className="text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Historique</h1>
          <p className="text-sm text-muted-foreground">
            {mockHistory.length} éléments générés
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher…"
            className="pl-9 bg-muted/40"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'course', 'quiz', 'bulletin'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === t
                  ? 'text-white border-transparent'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
              style={typeFilter === t ? { backgroundColor: BRAND } : {}}
            >
              {t === 'all' ? 'Tous' : TYPE_LABELS[t].label}
            </button>
          ))}
        </div>
        <select
          className="rounded-xl bg-muted/40 border border-border px-3 py-2 text-xs outline-none"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          {ALL_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-muted/20 py-16 text-center text-sm text-muted-foreground">
          Aucun résultat pour cette recherche.
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          {filtered.map((entry, i) => {
            const meta = TYPE_LABELS[entry.type]
            const Icon = meta.icon
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/20 ${
                  i !== filtered.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="h-9 w-9 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{entry.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                    {entry.words && (
                      <span className="text-xs text-muted-foreground">· {entry.words} mots</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-[10px] border hidden sm:flex ${meta.class}`}>
                    {meta.label}
                  </Badge>
                  <Badge className="text-[10px] border border-border text-muted-foreground bg-muted/40 hidden md:flex">
                    {entry.level}
                  </Badge>
                  <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                    <Eye size={15} />
                  </button>
                  <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                    <Download size={15} />
                  </button>
                  <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                    <Share2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
        </p>
      )}

      <div className="flex justify-center">
        <Button variant="outline" size="sm">Charger plus</Button>
      </div>
    </div>
  )
}

