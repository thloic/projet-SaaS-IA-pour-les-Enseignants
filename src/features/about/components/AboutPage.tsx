'use client'

import { BookOpenCheck, HeartHandshake, ShieldCheck, Sparkles, Users } from 'lucide-react'
import PublicPageShell from '@/features/marketing/components/PublicPageShell'
import { usePublicLocale } from '@/features/marketing/hooks/usePublicLocale'

const copy = {
  en: {
    eyebrow: 'ABOUT EDUCASSIST',
    title: 'Technology that gives teachers time back.',
    description: 'EducAssist is designed around a simple conviction: AI should reduce repetitive work without taking professional judgment away from teachers.',
    missionTitle: 'Our mission',
    missionText: 'Bring lesson preparation, differentiated content, classroom follow-up, grading support, and parent communication into one coherent workspace—grounded in the teacher’s real context.',
    promiseTitle: 'The teacher stays in control',
    promiseText: 'EducAssist prepares, structures, and suggests. The teacher reviews, adapts, and decides. Every feature is built around that division of responsibility.',
    principlesTitle: 'What guides the product',
    principles: [
      ['Useful before impressive', 'We prioritize tools teachers can use immediately in a real classroom.'],
      ['Context matters', 'Country, level, subject, students, and teaching preferences shape relevant results.'],
      ['Privacy by design', 'Student data must remain isolated, minimal, and protected throughout the workflow.'],
      ['One connected workspace', 'Each module contributes to a clearer, long-term view of the student and the class.'],
    ],
    journeyTitle: 'A platform built progressively',
    journeyText: 'The roadmap connects five major areas: grading, lesson adaptation, parent communication, curriculum planning, and real-time classroom tools. They are delivered progressively so every release remains reliable and genuinely useful.',
  },
  fr: {
    eyebrow: 'À PROPOS D’EDUCASSIST',
    title: 'La technologie qui redonne du temps aux enseignants.',
    description: 'EducAssist repose sur une conviction simple : l’IA doit réduire les tâches répétitives sans retirer aux enseignants leur jugement professionnel.',
    missionTitle: 'Notre mission',
    missionText: 'Réunir la préparation des cours, la différenciation pédagogique, le suivi de classe, l’aide à la correction et la communication avec les parents dans un espace cohérent, ancré dans la réalité de chaque enseignant.',
    promiseTitle: 'L’enseignant garde le contrôle',
    promiseText: 'EducAssist prépare, structure et propose. L’enseignant relit, adapte et décide. Chaque fonctionnalité respecte cette répartition des rôles.',
    principlesTitle: 'Ce qui guide le produit',
    principles: [
      ['Utile avant d’être spectaculaire', 'Nous privilégions les outils utilisables immédiatement dans une vraie classe.'],
      ['Le contexte compte', 'Pays, niveau, matière, élèves et préférences pédagogiques rendent les résultats pertinents.'],
      ['Confidentialité dès la conception', 'Les données élèves doivent rester isolées, minimales et protégées à chaque étape.'],
      ['Un espace réellement connecté', 'Chaque module contribue à une vision plus claire et durable de l’élève et de la classe.'],
    ],
    journeyTitle: 'Une plateforme construite progressivement',
    journeyText: 'La feuille de route relie cinq grands espaces : correction, adaptation des leçons, communication avec les parents, planification des programmes et outils de classe en temps réel. Ils sont livrés progressivement pour garantir des fonctionnalités fiables et réellement utiles.',
  },
} as const

const principleIcons = [Sparkles, BookOpenCheck, ShieldCheck, Users]

export default function AboutPage() {
  const { locale, setLocale } = usePublicLocale()
  const t = copy[locale]

  return (
    <PublicPageShell
      locale={locale}
      onLocaleChange={setLocale}
      eyebrow={t.eyebrow}
      title={t.title}
      description={t.description}
    >
      <div className="space-y-16">
        <section className="grid overflow-hidden rounded-3xl border border-[#534AB7]/15 bg-white/70 dark:border-white/10 dark:bg-white/[0.035] lg:grid-cols-2">
          <div className="p-7 sm:p-10">
            <HeartHandshake size={32} className="text-[#C8A032]" />
            <h2 className="mt-6 text-2xl font-black sm:text-3xl">{t.missionTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-white/55 sm:text-base">{t.missionText}</p>
          </div>
          <div className="border-t border-[#534AB7]/15 bg-[#534AB7]/10 p-7 dark:border-white/10 dark:bg-[#534AB7]/15 sm:p-10 lg:border-l lg:border-t-0">
            <ShieldCheck size={32} className="text-[#7F77DD]" />
            <h2 className="mt-6 text-2xl font-black sm:text-3xl">{t.promiseTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-white/55 sm:text-base">{t.promiseText}</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-black sm:text-3xl">{t.principlesTitle}</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {t.principles.map(([title, description], index) => {
              const Icon = principleIcons[index]
              return (
                <article key={title} className="rounded-2xl border border-[#534AB7]/15 bg-white/70 p-6 transition-colors hover:border-[#7F77DD]/45 dark:border-white/10 dark:bg-white/[0.035]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#534AB7]/25 text-[#7F77DD]">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-5 font-bold sm:text-lg">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-white/50">{description}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-[#7F77DD]/30 bg-[#534AB7]/15 p-8 sm:p-12">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#7F77DD]/20 blur-3xl" />
          <div className="relative max-w-3xl">
            <h2 className="text-2xl font-black sm:text-3xl">{t.journeyTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-white/60 sm:text-base">{t.journeyText}</p>
          </div>
        </section>
      </div>
    </PublicPageShell>
  )
}
