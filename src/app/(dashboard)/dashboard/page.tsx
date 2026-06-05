'use client'

import { useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  History,
  MessageSquare,
  Search,
  TrendingUp,
  ThumbsDown,
  ThumbsUp,
  Eye,
  Download,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const BRAND = '#534AB7'

const quickActions = [
  {
    title: 'Nouveau cours',
    description: 'Cours complet en moins de 2 min',
    icon: BookOpen,
    href: '/generate',
    badge: 'IA',
    style: 'violet',
    cta: 'Commencer',
  },
  {
    title: 'Quiz & QCM',
    description: 'Généré depuis vos cours',
    icon: ClipboardList,
    href: '/quiz',
    badge: 'Auto',
    style: 'teal',
    cta: 'Créer',
  },
  {
    title: 'Commentaire bulletin',
    description: 'Personnalisé en 5 secondes',
    icon: MessageSquare,
    href: '/bulletin',
    badge: 'Rapide',
    style: 'amber',
    cta: 'Rédiger',
  },
]

const stats = [
  { label: 'Cours générés', value: '12', icon: TrendingUp, color: 'text-emerald-400' },
  { label: 'Quiz créés', value: '8', icon: ClipboardCheck, color: 'text-sky-400' },
  { label: 'Bulletins rédigés', value: '34', icon: FileText, color: 'text-amber-400' },
  { label: 'Temps économisé', value: '6h', icon: Clock, color: 'text-violet-400' },
]

const historyItems = [
  {
    title: 'Théorème de Pythagore',
    subject: 'Maths · 3ème',
    type: 'Cours',
    date: 'il y a 2h',
    feedback: 'up',
    badgeColor: 'bg-violet-500/20 text-violet-200 border-violet-500/30',
  },
  {
    title: 'La Révolution française',
    subject: 'Histoire · 4ème',
    type: 'Quiz',
    date: 'hier',
    feedback: 'down',
    badgeColor: 'bg-sky-500/20 text-sky-200 border-sky-500/30',
  },
  {
    title: 'Analyse de texte narratif',
    subject: 'Français · 5ème',
    type: 'Cours',
    date: 'il y a 2 jours',
    feedback: 'up',
    badgeColor: 'bg-violet-500/20 text-violet-200 border-violet-500/30',
  },
  {
    title: 'Écosystèmes & biodiversité',
    subject: 'SVT · 6ème',
    type: 'Bulletin',
    date: 'il y a 3 jours',
    feedback: 'up',
    badgeColor: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
  },
  {
    title: 'Present perfect',
    subject: 'Anglais · 4ème',
    type: 'Quiz',
    date: 'il y a 5 jours',
    feedback: null,
    badgeColor: 'bg-sky-500/20 text-sky-200 border-sky-500/30',
  },
]

function formatDate(): string {
  const now = new Date()
  return now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function DashboardPage() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const formattedDate = useMemo(() => formatDate(), [])

  useGSAP(
    () => {
      gsap.fromTo(
        '.action-card',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
      )
      gsap.fromTo(
        '.stat-card',
        { opacity: 0 },
        { opacity: 1, duration: 0.5, stagger: 0.15, ease: 'power1.out' }
      )
    },
    { scope: containerRef }
  )

  return (
    <div ref={containerRef} className="space-y-8 pb-20 lg:pb-6">
      {/* Header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black">Bonjour Marie 👋</h1>
          <p className="text-muted-foreground capitalize">
            {formattedDate} · Que préparez-vous aujourd&apos;hui ?
          </p>
        </div>
        <div className="relative w-full max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            className="w-full rounded-xl bg-muted/40 border border-border px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Rechercher un cours, un quiz, un bulletin..."
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {quickActions.map(({ title, description, icon: Icon, href, badge, style, cta }) => (
          <div
            key={title}
            className={`action-card group rounded-2xl border p-6 transition-transform hover:-translate-y-1 ${
              style === 'violet'
                ? 'bg-[#17142a] border-violet-500/30'
                : style === 'teal'
                ? 'bg-[#0f1a18] border-teal-500/30'
                : 'bg-[#1a1408] border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                  style === 'violet'
                    ? 'bg-violet-500/20 text-violet-300'
                    : style === 'teal'
                    ? 'bg-teal-500/20 text-teal-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                <Icon size={22} />
              </div>
              <Badge
                className="text-[10px]"
                style={{ backgroundColor: BRAND, color: 'white' }}
              >
                {badge}
              </Badge>
            </div>
            <div className="mt-5 space-y-2">
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Button
              className="mt-6"
              style={{ backgroundColor: BRAND, color: 'white' }}
              onClick={() => router.push(href)}
            >
              {cta}
            </Button>
          </div>
        ))}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="stat-card rounded-2xl border border-border bg-card/40 p-4 flex items-center gap-3"
          >
            <div className={`h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center ${color}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* History */}
      <section className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={18} className="text-muted-foreground" />
            <h2 className="text-lg font-bold">Historique récent</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/history')}>
            Voir tout
          </Button>
        </div>

        <div className="space-y-3">
          {historyItems.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50 lg:flex-row lg:items-center"
            >
              <div className="flex-1">
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.subject}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{item.date}</span>
                <Badge className={`border ${item.badgeColor}`}>{item.type}</Badge>
              </div>
              <div className="flex items-center gap-2">
                {item.feedback === 'up' && <ThumbsUp size={16} className="text-emerald-400" />}
                {item.feedback === 'down' && <ThumbsDown size={16} className="text-rose-400" />}
                {!item.feedback && <ThumbsUp size={16} className="text-muted-foreground" />}
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg border border-border hover:bg-muted/60">
                  <Eye size={16} />
                </button>
                <button className="p-2 rounded-lg border border-border hover:bg-muted/60">
                  <Download size={16} />
                </button>
                <button className="p-2 rounded-lg border border-border hover:bg-muted/60">
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
