'use client'

import { useState } from 'react'
import { ChevronDown, CircleHelp } from 'lucide-react'
import PublicPageShell from '@/features/marketing/components/PublicPageShell'
import { usePublicLocale } from '@/features/marketing/hooks/usePublicLocale'

const copy = {
  en: {
    eyebrow: 'FREQUENTLY ASKED QUESTIONS',
    title: 'Clear answers before you get started.',
    description: 'Everything you need to understand how EducAssist supports your preparation, classroom work, and student follow-up.',
    questions: [
      ['What can I do with EducAssist?', 'EducAssist is being built around five connected areas: AI-assisted grading, lesson adaptation, parent communication, curriculum-aligned planning, and real-time classroom follow-up. Available tools appear directly in your dashboard as they are released.'],
      ['Do I need to know how to write AI prompts?', 'No. The platform uses guided forms. You provide the teaching context, level, objectives, and useful constraints; EducAssist prepares the instruction sent to the AI for you.'],
      ['Does EducAssist replace the teacher’s judgment?', 'No. Generated content is a working draft. The teacher remains responsible for reviewing, adjusting, and approving every lesson, comment, adaptation, or communication before using it.'],
      ['Which documents can I import?', 'You can currently enter text directly or import digital TXT, PDF, and DOCX files. The extracted content remains editable so you can review it before using it. Scanned or handwritten documents are not yet supported.'],
      ['Can I export generated content?', 'The product roadmap includes PDF and Word exports for lessons, adaptations, comments, and messages. Export availability is shown inside each compatible tool.'],
      ['How is student data protected?', 'Student information is isolated by teacher account using Supabase Row Level Security. Sensitive student data must remain limited to what is necessary, including when AI tools are used.'],
      ['How does the teacher profile help?', 'Your subject, teaching levels, country, grading system, language, and pedagogical preferences are collected once during onboarding and reused to personalize future generations.'],
      ['Is there a free plan?', 'The planned freemium access includes a limited number of generations. The dashboard displays usage and warns you before the limit is reached. Paid plans are designed for individual teachers, schools, and districts.'],
      ['Can I use EducAssist on a phone?', 'Yes. The web experience is designed mobile-first for classroom use. A separate native mobile application may come later, but the current priority is a reliable responsive web platform.'],
    ],
  },
  fr: {
    eyebrow: 'QUESTIONS FRÉQUENTES',
    title: 'Des réponses claires avant de commencer.',
    description: 'Tout ce qu’il faut savoir sur la préparation, le travail en classe et le suivi des élèves avec EducAssist.',
    questions: [
      ['Que puis-je faire avec EducAssist ?', 'EducAssist se construit autour de cinq espaces reliés : correction assistée par IA, adaptation des leçons, communication avec les parents, planification alignée sur les programmes et suivi de classe en temps réel. Les outils disponibles apparaissent directement dans votre tableau de bord.'],
      ['Dois-je savoir rédiger des prompts IA ?', 'Non. La plateforme utilise des formulaires guidés. Vous fournissez le contexte pédagogique, le niveau, les objectifs et les contraintes utiles ; EducAssist prépare les instructions destinées à l’IA.'],
      ['EducAssist remplace-t-il le jugement de l’enseignant ?', 'Non. Le contenu généré reste une proposition de travail. L’enseignant relit, ajuste et valide chaque cours, commentaire, adaptation ou communication avant de l’utiliser.'],
      ['Quels documents puis-je importer ?', 'Vous pouvez actuellement saisir du texte ou importer des fichiers numériques TXT, PDF et DOCX. Le contenu extrait reste modifiable pour être vérifié. Les documents scannés ou manuscrits ne sont pas encore pris en charge.'],
      ['Puis-je exporter les contenus générés ?', 'La feuille de route prévoit l’export PDF et Word des cours, adaptations, commentaires et messages. La disponibilité de l’export est indiquée dans chaque outil compatible.'],
      ['Comment les données des élèves sont-elles protégées ?', 'Les informations des élèves sont isolées par compte enseignant grâce aux règles Row Level Security de Supabase. Les données sensibles doivent rester limitées au strict nécessaire, notamment lors de l’utilisation de l’IA.'],
      ['À quoi sert le profil enseignant ?', 'Votre matière, vos niveaux, votre pays, votre système de notation, votre langue et vos préférences pédagogiques sont saisis une seule fois pendant l’onboarding, puis réutilisés pour personnaliser les générations.'],
      ['Existe-t-il une offre gratuite ?', 'L’accès freemium prévu comprend un nombre limité de générations. Le tableau de bord affiche votre consommation et vous avertit avant la limite. Des offres payantes sont prévues pour les enseignants, établissements et districts.'],
      ['Puis-je utiliser EducAssist sur téléphone ?', 'Oui. L’expérience web est pensée mobile-first pour une utilisation en classe. Une application mobile native pourra arriver plus tard, mais la priorité actuelle est une plateforme web responsive et fiable.'],
    ],
  },
} as const

export default function FaqPage() {
  const { locale, setLocale } = usePublicLocale()
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const t = copy[locale]

  return (
    <PublicPageShell
      locale={locale}
      onLocaleChange={setLocale}
      eyebrow={t.eyebrow}
      title={t.title}
      description={t.description}
    >
      <div className="grid gap-5 lg:grid-cols-[0.34fr_1fr]">
        <aside className="hidden rounded-3xl border border-[#534AB7]/15 bg-[#534AB7]/10 p-8 dark:border-white/10 dark:bg-[#534AB7]/15 lg:block">
          <CircleHelp size={36} className="text-[#C8A032]" />
          <p className="mt-6 text-sm leading-7 text-gray-600 dark:text-white/55">
            {locale === 'en'
              ? 'Click a question to reveal its answer. Still unsure? Our contact page is here for you.'
              : 'Cliquez sur une question pour dérouler sa réponse. Un doute persiste ? Notre page contact est là pour vous.'}
          </p>
        </aside>

        <div className="overflow-hidden rounded-3xl border border-[#534AB7]/15 bg-white/70 dark:border-white/10 dark:bg-white/[0.035]">
          {t.questions.map(([question, answer], index) => {
            const isOpen = openIndex === index
            return (
              <div key={question} className={index > 0 ? 'border-t border-[#534AB7]/15 dark:border-white/10' : ''}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-5 px-5 py-6 text-left sm:px-8"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="font-bold sm:text-lg">{question}</span>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${isOpen ? 'rotate-180 border-[#7F77DD] bg-[#534AB7] text-white' : 'border-[#534AB7]/20 text-gray-500 dark:border-white/15 dark:text-white/45'}`}>
                    <ChevronDown size={17} />
                  </span>
                </button>
                <div
                  id={`faq-answer-${index}`}
                  className={`grid transition-[grid-template-rows] duration-500 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                >
                  <div className="overflow-hidden">
                    <p className={`px-5 pb-7 pr-16 text-sm leading-7 text-gray-600 transition-all duration-500 dark:text-white/55 sm:px-8 sm:pr-24 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                      {answer}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PublicPageShell>
  )
}
