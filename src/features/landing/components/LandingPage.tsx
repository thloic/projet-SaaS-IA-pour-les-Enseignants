'use client'

import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  Moon,
  Sun,
  BookOpen,
  ClipboardList,
  MessageSquare,
  Check,
  ArrowUpRight,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import BrandLogo from '@/components/shared/BrandLogo'
import {
  landingTranslations,
  type LandingLocale,
} from '@/features/landing/i18n/landingTranslations'
import { useTheme } from '@/components/shared/ThemeProvider'

const BRAND = '#534AB7'
const FOOTER_LINKS = [
  ['#features', '#how', '#pricing'],
  ['/faq'],
  ['/about', '/contact'],
  [null, null, null],
] as const

export default function LandingPage() {
  const { isDark: dark, toggleTheme } = useTheme()
  const [locale, setLocale] = useState<LandingLocale>('en')
  const heroRef = useRef<HTMLDivElement>(null)
  const localeReadyRef = useRef(false)
  const t = landingTranslations[locale]

  useEffect(() => {
    if (!localeReadyRef.current) {
      localeReadyRef.current = true
      const savedLocale = window.localStorage.getItem('educassist-locale')
      if (savedLocale === 'en' || savedLocale === 'fr') {
        // Restores the visitor's explicit choice after the hydration-safe EN default.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocale(savedLocale)
        document.documentElement.lang = savedLocale
        return
      }
    }

    window.localStorage.setItem('educassist-locale', locale)
    document.documentElement.lang = locale
  }, [locale])

  function changeLocale(nextLocale: LandingLocale) {
    setLocale(nextLocale)
  }

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
          repeat: 5, // quelques flottements après l'arrivée, pas une boucle perpétuelle
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
  const footerBorder = dark ? 'border-white/10' : 'border-[#534AB7]/15'
  const footerMuted = dark ? 'text-white/55' : 'text-gray-600'
  const footerSoft = dark ? 'text-white/35' : 'text-gray-500'

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
          <Link href="/" className="flex items-center">
            <BrandLogo className="h-10 w-32" priority />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a
              href="#features"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              {t.nav.features}
            </a>
            <a
              href="#how"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              {t.nav.howItWorks}
            </a>
            <a
              href="#pricing"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              {t.nav.pricing}
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center rounded-lg border p-0.5 text-xs font-bold ${
                dark ? 'border-white/15' : 'border-gray-200'
              }`}
              role="group"
              aria-label={t.language}
            >
              {(['en', 'fr'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => changeLocale(option)}
                  className={`rounded-md px-2 py-1.5 uppercase transition-colors ${
                    locale === option
                      ? 'bg-[#534AB7] text-white'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  aria-pressed={locale === option}
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
              aria-label={
                dark ? t.theme.light : t.theme.dark
              }
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link href="/login" className="hidden sm:block">
              <Button variant="outline" size="sm">
                {t.nav.login}
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="text-white text-sm"
                style={{ backgroundColor: BRAND }}
              >
                <span className="hidden sm:inline">{t.nav.register}</span>
                <span className="sm:hidden">{t.nav.registerMobile}</span>
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
              {t.hero.eyebrow}
            </span>
          </div>

          <h1 className="hero-animate font-black leading-none tracking-tighter mb-8" style={{ fontSize: 'clamp(3.5rem, 9vw, 8.5rem)' }}>
            {t.hero.title}
            <br />
            <span style={{ color: '#7F77DD' }}>{t.hero.titleAccent}</span>
          </h1>

          <p
            className={`hero-animate text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${muted}`}
          >
            {t.hero.description}
          </p>

          <div className="hero-animate flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button
                size="lg"
                className="text-white px-8 h-12 text-base font-bold"
                style={{ backgroundColor: BRAND }}
              >
                {t.hero.primaryCta}
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
              {t.hero.demoCta}
            </Button>
          </div>
        </div>

        {/* Floating card — top left */}
        <div
          className={`float-card hidden lg:block absolute left-8 xl:left-16 top-1/3 rounded-2xl p-4 shadow-xl text-sm backdrop-blur border ${cardBg}`}
        >
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs mb-1.5">
            <Check size={12} /> {t.hero.generated}
          </div>
          <p className="font-semibold">{t.hero.generatedSubject}</p>
          <p className={`text-xs mt-0.5 ${muted}`}>
            {t.hero.generatedTopic}
          </p>
        </div>

        {/* Floating card — bottom left */}
        <div
          className={`float-card hidden lg:block absolute left-8 xl:left-16 bottom-1/3 rounded-2xl p-4 shadow-xl text-sm backdrop-blur border ${cardBg}`}
        >
          <div className="text-2xl font-black" style={{ color: BRAND }}>
            3
          </div>
          <p className="font-semibold text-sm mt-0.5">{t.hero.freeGenerations}</p>
          <p className={`text-xs mt-0.5 ${muted}`}>{t.hero.noCard}</p>
        </div>

        {/* Floating card — top right */}
        <div
          className={`float-card hidden lg:block absolute right-8 xl:right-16 top-1/3 rounded-2xl p-4 shadow-xl text-sm backdrop-blur border ${cardBg}`}
        >
          <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs mb-1.5">
            <ClipboardList size={12} /> {t.hero.quizGenerated}
          </div>
          <p className="font-semibold">{t.hero.questions}</p>
          <p className={`text-xs mt-0.5 ${muted}`}>{t.hero.questionTypes}</p>
        </div>

        {/* Floating card — bottom right */}
        <div
          className={`float-card hidden lg:block absolute right-8 xl:right-16 bottom-1/3 rounded-2xl p-4 shadow-xl text-sm backdrop-blur border ${cardBg}`}
        >
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs mb-1.5">
            <MessageSquare size={12} /> {t.hero.reportComment}
          </div>
          <p className="font-semibold">{t.hero.writtenIn}</p>
          <p className={`text-xs mt-0.5 ${muted}`}>{t.hero.reportQualities}</p>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              {t.features.title}
            </h2>
            <p className={`text-lg ${muted}`}>
              {t.features.subtitle}
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
                <h3 className="text-lg font-bold mb-1">{t.features.items[0].title}</h3>
                <p className={`text-sm leading-relaxed ${muted}`}>
                  {t.features.items[0].description}
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
                {t.features.included}
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
                <h3 className="text-lg font-bold mb-1">{t.features.items[1].title}</h3>
                <p className={`text-sm leading-relaxed ${muted}`}>
                  {t.features.items[1].description}
                </p>
              </div>
              <Badge
                className={`self-start ${
                  dark
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                    : 'bg-teal-100 text-teal-700 border-teal-200'
                }`}
              >
                {t.features.included}
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
                  {t.features.items[2].title}
                </h3>
                <p className={`text-sm leading-relaxed ${muted}`}>
                  {t.features.items[2].description}
                </p>
              </div>
              <Badge
                className={`self-start ${
                  dark
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-amber-100 text-amber-700 border-amber-200'
                }`}
              >
                {t.features.included}
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
              {t.how.title}
            </h2>
            <p className={`text-lg ${muted}`}>
              {t.how.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {t.how.steps.map(({ n, title, detail }) => (
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
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              {t.pricing.title}
            </h2>
            <p className={`text-lg ${muted}`}>
              {t.pricing.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {t.pricing.tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-6 border relative flex flex-col ${
                  tier.highlight
                    ? 'border-2'
                    : dark
                      ? 'bg-white/5 border-white/10'
                      : 'bg-gray-50 border-gray-200'
                }`}
                style={
                  tier.highlight
                    ? {
                        borderColor: BRAND,
                        backgroundColor: dark ? `${BRAND}20` : `${BRAND}08`,
                      }
                    : undefined
                }
              >
                {tier.highlight ? (
                  <span
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: BRAND }}
                  >
                    {t.pricing.popular}
                  </span>
                ) : null}

                <h3 className="font-bold text-xl mb-1">{tier.name}</h3>
                <p className={`text-sm min-h-10 mb-6 ${muted}`}>
                  {tier.audience}
                </p>
                <div className="text-3xl font-black mb-6">
                  {tier.price}{' '}
                  {tier.period ? (
                    <span className="text-base font-normal opacity-60">
                      {tier.period}
                    </span>
                  ) : null}
                </div>
                <ul
                  className={`space-y-3 text-sm mb-8 flex-1 ${
                    dark ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check
                        size={14}
                        className="text-emerald-400 shrink-0 mt-0.5"
                      />{' '}
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    tier.highlight ? 'text-white' : ''
                  }`}
                  variant={tier.highlight ? 'default' : 'outline'}
                  style={
                    tier.highlight ? { backgroundColor: BRAND } : undefined
                  }
                >
                  {tier.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className={`relative overflow-hidden border-t border-[#7F77DD]/30 transition-colors duration-300 ${
          dark ? 'bg-[#080711] text-white' : 'bg-[#F5F3FF] text-gray-950'
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              dark
                ? 'linear-gradient(rgba(127,119,221,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(127,119,221,0.08) 1px, transparent 1px)'
                : 'linear-gradient(rgba(83,74,183,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(83,74,183,0.1) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />
        <div
          className="pointer-events-none absolute left-1/2 top-56 h-[440px] w-[720px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ backgroundColor: dark ? 'rgba(83,74,183,0.2)' : 'rgba(127,119,221,0.18)' }}
        />

        <div className={`relative mx-auto max-w-7xl border-x ${footerBorder}`}>
          <section className="relative flex min-h-[340px] flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
            <div className="absolute left-[15%] top-14 h-px w-[22%] bg-gradient-to-r from-transparent to-[#7F77DD]/40" />
            <div className="absolute right-[15%] top-14 h-px w-[22%] bg-gradient-to-l from-transparent to-[#7F77DD]/40" />
            <div className="absolute bottom-0 left-1/2 h-32 w-px -translate-x-1/2 bg-gradient-to-b from-[#C8A032]/50 to-transparent" />

            <div
              className="relative mb-7 rounded-[24px] border border-[#7F77DD]/40 shadow-[0_0_60px_rgba(83,74,183,0.35)]"
            >
              <BrandLogo variant="mark" className="h-20 w-20 rounded-[24px]" />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#C8A032] shadow-[0_0_18px_rgba(200,160,50,0.9)]" />
            </div>
            <p className="mb-4 text-xs font-bold tracking-[0.28em] text-[#C8A032]">
              {t.footer.eyebrow}
            </p>
            <h2 className="max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
              {t.footer.title}
            </h2>
            <p className={`mt-5 max-w-2xl text-sm leading-7 sm:text-base ${footerMuted}`}>
              {t.footer.description}
            </p>
          </section>

          <div className={`grid grid-cols-2 border-y lg:grid-cols-4 ${footerBorder}`}>
            {t.footer.socials.map((social, index) => (
              <div
                key={social}
                className={`group flex min-h-20 items-center justify-between gap-3 px-5 py-4 sm:px-7 ${
                  index % 2 === 0 ? `border-r ${footerBorder}` : ''
                } ${index > 1 ? `border-t ${footerBorder} lg:border-t-0` : ''} ${
                  index < 3 ? `lg:border-r ${footerBorder}` : ''
                }`}
                aria-label={`${social} — ${t.footer.comingSoon}`}
              >
                <div>
                  <p className="text-sm font-semibold sm:text-base">{social}</p>
                  <p className={`mt-1 text-[10px] uppercase tracking-wider ${footerSoft}`}>
                    {t.footer.comingSoon}
                  </p>
                </div>
                <ArrowUpRight size={17} className="text-[#7F77DD] opacity-70" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4">
            {t.footer.groups.map((group, groupIndex) => (
              <div
                key={group.title}
                className={`min-h-64 px-6 py-10 sm:px-8 ${
                  groupIndex % 2 === 0 ? `border-r ${footerBorder}` : ''
                } ${groupIndex > 1 ? `border-t ${footerBorder} lg:border-t-0` : ''} ${
                  groupIndex < 3 ? `lg:border-r ${footerBorder}` : ''
                }`}
              >
                <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#7F77DD]">
                  {group.title}
                </h3>
                <ul className={`mt-7 space-y-4 text-sm ${dark ? 'text-white/65' : 'text-gray-600'}`}>
                  {group.links.map((label, linkIndex) => {
                    const href = FOOTER_LINKS[groupIndex]?.[linkIndex]
                    return (
                      <li key={label}>
                        {href ? (
                          <a
                            href={href}
                            className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-[#534AB7]'}`}
                          >
                            {label}
                          </a>
                        ) : (
                          <span className="cursor-default">{label}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className={`flex flex-col items-center justify-between gap-4 border-t px-6 py-7 text-center sm:flex-row sm:px-8 sm:text-left ${footerBorder}`}>
            <BrandLogo className="h-10 w-32" />
            <p className={`text-xs ${dark ? 'text-white/40' : 'text-gray-500'}`}>
              {t.footer.copyright}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
