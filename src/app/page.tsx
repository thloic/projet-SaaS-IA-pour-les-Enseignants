'use client'

import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  Brain,
  Moon,
  Sun,
  BookOpen,
  ClipboardList,
  MessageSquare,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const BRAND = '#534AB7'

const steps = [
  {
    n: '01',
    title: "Créez votre profil",
    detail: "90 sec. Nom, matière, niveau d'enseignement.",
  },
  {
    n: '02',
    title: 'Choisissez votre sujet',
    detail: 'Titre, objectifs, durée, niveau des élèves.',
  },
  {
    n: '03',
    title: "L'IA génère en temps réel",
    detail: 'Cours complet en streaming, visible instantanément.',
  },
  {
    n: '04',
    title: 'Exportez',
    detail: 'PDF ou Word, prêt à imprimer ou partager.',
  },
]

const freeFeatures = [
  '3 générations de cours',
  '3 quiz auto',
  '5 commentaires bulletin',
  'Export PDF',
]

const proFeatures = [
  'Générations illimitées',
  'Quiz illimités',
  'Bulletins illimités',
  'Export PDF + Word',
  'Partage public',
]

export default function Home() {
  const [dark, setDark] = useState(true)
  const heroRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const tl = gsap.timeline()
      tl.fromTo(
        '.hero-animate',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out' }
      )
      tl.fromTo(
        '.float-card',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.2, ease: 'power2.out' },
        '-=0.2'
      )
      tl.to(
        '.float-card',
        {
          y: -8,
          duration: 2.5,
          yoyo: true,
          repeat: -1,
          ease: 'power1.inOut',
          stagger: 0.5,
        },
        '+=0.3'
      )
    },
    { scope: heroRef }
  )

  const muted = dark ? 'text-gray-400' : 'text-gray-500'
  const cardBg = dark
    ? 'bg-[#1a1810] border-[rgba(180,140,40,0.3)]'
    : 'bg-white border-gray-200'

  return (
    <div
      className={`${dark ? 'dark text-white' : 'bg-white text-gray-900'} min-h-screen transition-colors duration-300`}
    >
      {/* ── NAVBAR ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md transition-colors duration-300 ${
          dark
            ? 'bg-[#111008]/80 border-[rgba(180,140,40,0.2)]'
            : 'bg-white/80 border-gray-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="rounded-lg p-1.5" style={{ backgroundColor: BRAND }}>
              <Brain className="text-white" size={20} />
            </div>
            <span className="font-black text-xl tracking-tight">EducAssist</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a
              href="#features"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              Fonctionnalités
            </a>
            <a
              href="#how"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              Comment ça marche
            </a>
            <a
              href="#pricing"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              Tarifs
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark((v) => !v)}
              className="p-2 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
              aria-label={
                dark ? 'Passer en mode clair' : 'Passer en mode sombre'
              }
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link href="/login" className="hidden sm:block">
              <Button variant="outline" size="sm">
                Se connecter
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="text-white text-sm"
                style={{ backgroundColor: BRAND }}
              >
                Commencer gratuitement
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden px-6"
      >
        {/* Subtle gold center glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl opacity-8 pointer-events-none"
          style={{ backgroundColor: 'rgba(180,140,40,0.12)' }}
        />

        {/* Central content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto py-20">
          <div className="hero-animate mb-8 flex justify-center">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest border"
              style={{
                borderColor: 'rgba(180,140,40,0.5)',
                color: 'rgba(200,160,50,1)',
                backgroundColor: 'rgba(180,140,40,0.08)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(200,160,50,1)' }}
              />
              IA · PÉDAGOGIE · ENSEIGNANTS
            </span>
          </div>

          <h1 className="hero-animate font-black leading-none tracking-tighter mb-8" style={{ fontSize: 'clamp(3.5rem, 9vw, 8.5rem)' }}>
            Préparez vos cours
            <br />
            <span style={{ color: '#7F77DD' }}>en quelques clics.</span>
          </h1>

          <p
            className={`hero-animate text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${muted}`}
          >
            Décrivez votre séance, l&apos;IA génère un cours complet, un quiz
            et les commentaires de bulletin — en moins de 60 secondes.
          </p>

          <div className="hero-animate flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button
                size="lg"
                className="text-white px-8 h-12 text-base font-bold"
                style={{ backgroundColor: BRAND }}
              >
                Créer mon compte gratuit →
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="px-8 h-12 text-base font-medium"
              style={{
                borderColor: 'rgba(180,140,40,0.4)',
                color: dark ? 'rgba(200,160,50,1)' : '#534AB7',
                backgroundColor: 'transparent',
              }}
            >
              Voir la démo
            </Button>
          </div>
        </div>

        {/* Floating card — top left */}
        <div
          className={`float-card hidden lg:block absolute left-8 xl:left-16 top-1/3 rounded-2xl p-4 shadow-xl text-sm backdrop-blur border ${cardBg}`}
        >
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs mb-1.5">
            <Check size={12} /> Cours généré
          </div>
          <p className="font-semibold">Histoire · Terminale</p>
          <p className={`text-xs mt-0.5 ${muted}`}>
            La Première Guerre mondiale
          </p>
        </div>

        {/* Floating card — bottom left */}
        <div
          className={`float-card hidden lg:block absolute left-8 xl:left-16 bottom-1/3 rounded-2xl p-4 shadow-xl text-sm backdrop-blur border ${cardBg}`}
        >
          <div className="text-2xl font-black" style={{ color: BRAND }}>
            3
          </div>
          <p className="font-semibold text-sm mt-0.5">générations gratuites</p>
          <p className={`text-xs mt-0.5 ${muted}`}>Sans carte bancaire</p>
        </div>

        {/* Floating card — top right */}
        <div
          className={`float-card hidden lg:block absolute right-8 xl:right-16 top-1/3 rounded-2xl p-4 shadow-xl text-sm backdrop-blur border ${cardBg}`}
        >
          <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs mb-1.5">
            <ClipboardList size={12} /> Quiz auto-généré
          </div>
          <p className="font-semibold">8 questions</p>
          <p className={`text-xs mt-0.5 ${muted}`}>QCM · Vrai/Faux · Ouvertes</p>
        </div>

        {/* Floating card — bottom right */}
        <div
          className={`float-card hidden lg:block absolute right-8 xl:right-16 bottom-1/3 rounded-2xl p-4 shadow-xl text-sm backdrop-blur border ${cardBg}`}
        >
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs mb-1.5">
            <MessageSquare size={12} /> Commentaire bulletin
          </div>
          <p className="font-semibold">Rédigé en 5s</p>
          <p className={`text-xs mt-0.5 ${muted}`}>Personnalisé · Bienveillant</p>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className={`text-lg ${muted}`}>
              Trois outils pédagogiques propulsés par l&apos;IA
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Violet */}
            <div
              className="rounded-2xl p-6 flex flex-col gap-4 border"
              style={{
                backgroundColor: dark ? `${BRAND}18` : `${BRAND}0D`,
                borderColor: `${BRAND}50`,
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: BRAND }}
              >
                <BookOpen className="text-white" size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Génération de cours</h3>
                <p className={`text-sm leading-relaxed ${muted}`}>
                  Un formulaire guidé, zéro prompt. L&apos;IA structure et
                  rédige votre cours complet, exportable en PDF ou Word.
                </p>
              </div>
              <Badge
                className="self-start"
                style={{
                  backgroundColor: `${BRAND}30`,
                  color: '#7F77DD',
                  borderColor: `${BRAND}50`,
                }}
              >
                Inclus
              </Badge>
            </div>

            {/* Teal */}
            <div
              className={`rounded-2xl p-6 flex flex-col gap-4 border ${
                dark
                  ? 'bg-[#0e1a18] border-teal-500/30'
                  : 'bg-teal-50 border-teal-200'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center">
                <ClipboardList className="text-white" size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Quiz &amp; QCM auto</h3>
                <p className={`text-sm leading-relaxed ${muted}`}>
                  5 à 10 questions générées après chaque cours : QCM, vrai/faux,
                  questions ouvertes avec barème intégré.
                </p>
              </div>
              <Badge
                className={`self-start ${
                  dark
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                    : 'bg-teal-100 text-teal-700 border-teal-200'
                }`}
              >
                Inclus
              </Badge>
            </div>

            {/* Amber */}
            <div
              className={`rounded-2xl p-6 flex flex-col gap-4 border ${
                dark
                  ? 'bg-[#1a1500] border-amber-500/30'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                <MessageSquare className="text-white" size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">
                  Commentaires bulletins
                </h3>
                <p className={`text-sm leading-relaxed ${muted}`}>
                  Nom, matière, note, observations — l&apos;IA génère un
                  commentaire bienveillant, personnalisé et adapté.
                </p>
              </div>
              <Badge
                className={`self-start ${
                  dark
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-amber-100 text-amber-700 border-amber-200'
                }`}
              >
                Inclus
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section
        id="how"
        className={`py-24 px-6 transition-colors ${
          dark ? 'bg-[#0d0c06]/60' : 'bg-gray-50'
        }`}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Comment ça marche
            </h2>
            <p className={`text-lg ${muted}`}>
              Opérationnel en moins de 2 minutes
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {steps.map(({ n, title, detail }) => (
              <div key={n} className="flex flex-col gap-3">
                <span
                  className="text-5xl font-black"
                  style={{ color: BRAND, opacity: 0.35 }}
                >
                  {n}
                </span>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className={`text-sm leading-relaxed ${muted}`}>{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TARIFS ── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Tarifs simples
            </h2>
            <p className={`text-lg ${muted}`}>
              Commencez gratuitement, évoluez quand vous le souhaitez
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Gratuit */}
            <div
              className={`rounded-2xl p-8 border ${
                dark
                  ? 'bg-white/5 border-white/10'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <h3 className="font-bold text-xl mb-1">Gratuit</h3>
              <p className={`text-sm mb-6 ${muted}`}>Pour découvrir</p>
              <div className="text-4xl font-black mb-6">
                0{' '}
                <span className="text-lg font-normal opacity-60">€/mois</span>
              </div>
              <ul
                className={`space-y-3 text-sm mb-8 ${
                  dark ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check
                      size={14}
                      className="text-emerald-400 shrink-0"
                    />{' '}
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button variant="outline" className="w-full">
                  Commencer gratuitement
                </Button>
              </Link>
            </div>

            {/* Pro */}
            <div
              className="rounded-2xl p-8 border-2 relative"
              style={{
                borderColor: BRAND,
                backgroundColor: dark ? `${BRAND}20` : `${BRAND}08`,
              }}
            >
              <span
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: BRAND }}
              >
                Populaire
              </span>
              <h3 className="font-bold text-xl mb-1">Pro</h3>
              <p className={`text-sm mb-6 ${muted}`}>
                Pour les enseignants actifs
              </p>
              <div className="text-4xl font-black mb-6">À venir</div>
              <ul
                className={`space-y-3 text-sm mb-8 ${
                  dark ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check
                      size={14}
                      className="text-emerald-400 shrink-0"
                    />{' '}
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full text-white"
                style={{ backgroundColor: BRAND }}
              >
                Rejoindre la liste d&apos;attente
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className={`border-t py-10 px-6 transition-colors ${
          dark
            ? 'border-[rgba(180,140,40,0.2)] bg-[#111008]/60'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="rounded-lg p-1.5"
              style={{ backgroundColor: BRAND }}
            >
              <Brain className="text-white" size={16} />
            </div>
            <span className="font-bold">EducAssist</span>
          </div>

          <div className={`flex items-center gap-6 text-sm ${muted}`}>
            <a
              href="#"
              className="hover:opacity-100 opacity-70 transition-opacity"
            >
              Mentions légales
            </a>
            <a
              href="#"
              className="hover:opacity-100 opacity-70 transition-opacity"
            >
              Confidentialité
            </a>
            <a
              href="#"
              className="hover:opacity-100 opacity-70 transition-opacity"
            >
              Contact
            </a>
          </div>

          <p className={`text-xs ${muted}`}>
            © 2026 EducAssist. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  )
}
