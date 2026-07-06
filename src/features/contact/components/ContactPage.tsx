'use client'

import { useRef, useState } from 'react'
import { ArrowRight, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/shared/ToastProvider'
import PublicPageShell from '@/features/marketing/components/PublicPageShell'
import { usePublicLocale } from '@/features/marketing/hooks/usePublicLocale'
import { contactSchema } from '@/features/contact/schemas/contactSchema'
import { submitContactAction } from '@/features/contact/server/contact.actions'

const copy = {
  en: {
    eyebrow: 'CONTACT',
    title: 'Let’s talk about your teaching needs.',
    description: 'Tell us how to reach you and what you would like to discuss. Our team will get back to you as soon as possible.',
    name: 'Name',
    email: 'Email address',
    subject: 'Subject',
    phone: 'Phone number',
    submit: 'Send my request',
    sending: 'Sending…',
    success: 'Your request has been sent. We will get back to you shortly.',
    error: 'Please check the information entered before continuing.',
    placeholders: ['Jane Smith', 'jane@school.org', 'School plan, demo, support…', '+1 555 123 4567'],
    asideTitle: 'A real conversation, not a ticket number.',
    asideText: 'Questions about the product, school deployment, pricing, or getting started are all welcome.',
  },
  fr: {
    eyebrow: 'CONTACT',
    title: 'Parlons de vos besoins pédagogiques.',
    description: 'Indiquez-nous comment vous joindre et le sujet que vous souhaitez aborder. Notre équipe vous répondra dans les meilleurs délais.',
    name: 'Nom',
    email: 'Adresse email',
    subject: 'Sujet',
    phone: 'Numéro de téléphone',
    submit: 'Envoyer ma demande',
    sending: 'Envoi…',
    success: 'Votre demande a bien été envoyée. Nous vous répondrons rapidement.',
    error: 'Vérifiez les informations saisies avant de continuer.',
    placeholders: ['Marie Dupont', 'marie@ecole.fr', 'Offre établissement, démonstration, assistance…', '+228 90 00 00 00'],
    asideTitle: 'Une vraie conversation, pas un numéro de ticket.',
    asideText: 'Produit, déploiement dans un établissement, tarifs ou prise en main : toutes vos questions sont les bienvenues.',
  },
} as const

export default function ContactPage() {
  const { locale, setLocale } = usePublicLocale()
  const { showToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const t = copy[locale]

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const parsed = contactSchema.safeParse(Object.fromEntries(formData))

    if (!parsed.success) {
      showToast(t.error, 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await submitContactAction(formData)
      if (!result.success) {
        showToast(locale === 'en' ? 'We could not send your request right now. Please try again.' : result.error ?? 'Impossible d’envoyer votre demande.', 'error')
        return
      }

      formRef.current?.reset()
      showToast(t.success, 'success')
    } catch (error) {
      console.error('[contact] action indisponible', error)
      showToast(locale === 'en' ? 'We could not send your request right now. Please try again.' : 'Impossible d’envoyer votre demande pour le moment.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PublicPageShell
      locale={locale}
      onLocaleChange={setLocale}
      eyebrow={t.eyebrow}
      title={t.title}
      description={t.description}
    >
      <div className="grid overflow-hidden rounded-3xl border border-[#534AB7]/15 bg-white/70 shadow-2xl shadow-[#534AB7]/10 dark:border-white/10 dark:bg-white/[0.035] lg:grid-cols-[1fr_0.68fr]">
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5 p-6 sm:p-9">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t.name}</Label>
              <Input id="name" name="name" placeholder={t.placeholders[0]} className="h-11 border-[#534AB7]/15 bg-white/80 dark:border-white/10 dark:bg-white/5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t.email}</Label>
              <Input id="email" name="email" type="email" placeholder={t.placeholders[1]} className="h-11 border-[#534AB7]/15 bg-white/80 dark:border-white/10 dark:bg-white/5" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">{t.subject}</Label>
            <Input id="subject" name="subject" placeholder={t.placeholders[2]} className="h-11 border-[#534AB7]/15 bg-white/80 dark:border-white/10 dark:bg-white/5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t.phone}</Label>
            <Input id="phone" name="phone" type="tel" placeholder={t.placeholders[3]} className="h-11 border-[#534AB7]/15 bg-white/80 dark:border-white/10 dark:bg-white/5" />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full bg-[#534AB7] font-bold text-white hover:bg-[#6259C8]"
          >
            {isSubmitting ? t.sending : t.submit} {!isSubmitting && <ArrowRight size={16} />}
          </Button>
        </form>

        <aside className="relative flex flex-col justify-between border-t border-[#534AB7]/15 bg-[#534AB7]/10 p-7 dark:border-white/10 dark:bg-[#534AB7]/15 lg:border-l lg:border-t-0 lg:p-9">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#534AB7]">
              <Mail size={21} />
            </div>
            <h2 className="text-2xl font-black">{t.asideTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-white/55">{t.asideText}</p>
          </div>
          <div className="mt-10 flex items-center gap-2 text-xs text-[#C8A032]">
            <Phone size={14} /> {t.phone}
          </div>
        </aside>
      </div>
    </PublicPageShell>
  )
}
