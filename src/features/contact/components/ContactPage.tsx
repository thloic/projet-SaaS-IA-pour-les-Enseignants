'use client'

import { useRef, useState } from 'react'
import { ArrowRight, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/shared/ToastProvider'
import PublicPageShell from '@/features/marketing/components/PublicPageShell'
import { usePublicLocale } from '@/features/marketing/hooks/usePublicLocale'
import { contactReasonValues, contactSchema, type ContactReason } from '@/features/contact/schemas/contactSchema'
import { submitContactAction } from '@/features/contact/server/contact.actions'

const FIELD_CLASS = 'h-11 border-[#534AB7]/15 bg-white/80 dark:border-white/10 dark:bg-white/5'
const SELECT_CLASS =
  'h-11 w-full rounded-md border border-[#534AB7]/15 bg-white/80 px-3 text-sm outline-none focus:ring-2 focus:ring-[#534AB7]/20 dark:border-white/10 dark:bg-white/5'
const TEXTAREA_CLASS =
  'w-full rounded-md border border-[#534AB7]/15 bg-white/80 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#534AB7]/20 dark:border-white/10 dark:bg-white/5 resize-y'

const copy = {
  en: {
    eyebrow: 'CONTACT',
    title: 'Let’s talk about your teaching needs.',
    description: 'Tell us how to reach you and what you would like to discuss. Our team will get back to you as soon as possible.',
    name: 'Name',
    email: 'Email address',
    phone: 'Phone number (optional)',
    organization: 'School / organization (optional)',
    reason: 'What is this about?',
    message: 'Your message',
    submit: 'Send my request',
    sending: 'Sending…',
    success: 'Your request has been sent. We will get back to you shortly.',
    error: 'Please check the information entered before continuing.',
    placeholders: {
      name: 'Jane Smith',
      email: 'jane@school.org',
      phone: '+1 555 123 4567',
      organization: 'Lincoln Elementary School',
      message: 'Tell us what you would like to discuss…',
    },
    reasons: {
      demo: 'Request a demo',
      teacher_subscription: 'Individual subscription',
      school: 'School plan',
      district: 'District plan',
      support: 'Support',
      partnership: 'Partnership',
      other: 'Other',
    },
    asideTitle: 'A real conversation, not a ticket number.',
    asideText: 'Questions about the product, school deployment, pricing, or getting started are all welcome.',
    genericError: 'We could not send your request right now. Please try again.',
  },
  fr: {
    eyebrow: 'CONTACT',
    title: 'Parlons de vos besoins pédagogiques.',
    description: 'Indiquez-nous comment vous joindre et le sujet que vous souhaitez aborder. Notre équipe vous répondra dans les meilleurs délais.',
    name: 'Nom',
    email: 'Adresse email',
    phone: 'Numéro de téléphone (facultatif)',
    organization: 'École / établissement (facultatif)',
    reason: 'Quel est le sujet ?',
    message: 'Votre message',
    submit: 'Envoyer ma demande',
    sending: 'Envoi…',
    success: 'Votre demande a bien été envoyée. Nous vous répondrons rapidement.',
    error: 'Vérifiez les informations saisies avant de continuer.',
    placeholders: {
      name: 'Marie Dupont',
      email: 'marie@ecole.fr',
      phone: '+228 90 00 00 00',
      organization: 'École primaire des Lilas',
      message: 'Décrivez ce que vous souhaitez aborder…',
    },
    reasons: {
      demo: 'Demander une démonstration',
      teacher_subscription: 'Abonnement individuel',
      school: 'Offre établissement',
      district: 'Offre multi-établissements',
      support: 'Assistance',
      partnership: 'Partenariat',
      other: 'Autre',
    },
    asideTitle: 'Une vraie conversation, pas un numéro de ticket.',
    asideText: 'Produit, déploiement dans un établissement, tarifs ou prise en main : toutes vos questions sont les bienvenues.',
    genericError: 'Impossible d’envoyer votre demande pour le moment. Réessayez.',
  },
  es: {
    eyebrow: 'CONTACTO',
    title: 'Hablemos de tus necesidades educativas.',
    description: 'Indícanos cómo contactar contigo y qué tema quieres tratar. Nuestro equipo te responderá lo antes posible.',
    name: 'Nombre',
    email: 'Correo electrónico',
    phone: 'Número de teléfono (opcional)',
    organization: 'Centro educativo (opcional)',
    reason: '¿Sobre qué quieres hablar?',
    message: 'Tu mensaje',
    submit: 'Enviar mi solicitud',
    sending: 'Enviando…',
    success: 'Tu solicitud se ha enviado correctamente. Te responderemos pronto.',
    error: 'Revisa la información introducida antes de continuar.',
    placeholders: {
      name: 'María García',
      email: 'maria@centro.es',
      phone: '+34 600 000 000',
      organization: 'Colegio San José',
      message: 'Cuéntanos qué quieres tratar…',
    },
    reasons: {
      demo: 'Solicitar una demostración',
      teacher_subscription: 'Suscripción individual',
      school: 'Plan para centros',
      district: 'Plan multi-centros',
      support: 'Ayuda',
      partnership: 'Colaboración',
      other: 'Otro',
    },
    asideTitle: 'Una conversación real, no un número de incidencia.',
    asideText: 'Producto, implantación en un centro, precios o primeros pasos: todas tus preguntas son bienvenidas.',
    genericError: 'No se ha podido enviar tu solicitud en este momento. Inténtalo de nuevo.',
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
        showToast(result.error ?? t.genericError, 'error')
        return
      }

      formRef.current?.reset()
      showToast(t.success, 'success')
    } catch (error) {
      console.error('[contact] action indisponible', error)
      showToast(t.genericError, 'error')
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
          <input type="hidden" name="locale" value={locale} />
          {/* Piège à robots : un champ vide pour un humain, mais souvent rempli
              automatiquement par un bot de soumission. Hors champ visuel plutôt
              que display:none, certains bots ignorant les champs masqués ainsi. */}
          <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t.name}</Label>
              <Input id="name" name="name" placeholder={t.placeholders.name} className={FIELD_CLASS} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t.email}</Label>
              <Input id="email" name="email" type="email" placeholder={t.placeholders.email} className={FIELD_CLASS} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="organization">{t.organization}</Label>
              <Input id="organization" name="organization" placeholder={t.placeholders.organization} className={FIELD_CLASS} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t.phone}</Label>
              <Input id="phone" name="phone" type="tel" placeholder={t.placeholders.phone} className={FIELD_CLASS} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">{t.reason}</Label>
            <select id="reason" name="reason" defaultValue="" required className={SELECT_CLASS}>
              <option value="" disabled>
                {t.reason}
              </option>
              {contactReasonValues.map((reason: ContactReason) => (
                <option key={reason} value={reason}>
                  {t.reasons[reason]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">{t.message}</Label>
            <textarea
              id="message"
              name="message"
              rows={5}
              placeholder={t.placeholders.message}
              className={TEXTAREA_CLASS}
            />
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
