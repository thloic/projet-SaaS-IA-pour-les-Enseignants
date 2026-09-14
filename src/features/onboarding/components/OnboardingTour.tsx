'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, FileText, LayoutDashboard, MessageCircle, School, UsersRound, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { markOnboardingTourSeenAction } from '@/features/profile/server/profile.actions'
import type { AppLocale } from '@/features/i18n/locale'

interface OnboardingTourProps {
  locale: AppLocale
}

const COPY = {
  fr: {
    skip: 'Passer',
    previous: 'Précédent',
    next: 'Suivant',
    finish: 'Créer ma première classe',
    close: 'Fermer le tutoriel',
    progress: 'Étape {current} sur {total}',
    error: 'Impossible d’enregistrer votre choix. Réessayez.',
    steps: [
      { title: 'Bienvenue dans EducAssist', description: 'Centralisez vos classes, vos observations et vos documents pédagogiques dans un même espace.' },
      { title: 'Créez votre classe', description: 'Ajoutez vos élèves une seule fois, puis enrichissez progressivement leur dossier au fil des séances.' },
      { title: 'Ajoutez votre modèle', description: 'Collez le modèle texte de votre établissement pendant la création de la classe, ou ajoutez ensuite son PDF dans les réglages.' },
      { title: 'Travaillez avec l’agent', description: 'Demandez un PAT ou un commentaire de bulletin : l’agent s’appuie sur le dossier réel de l’élève et votre modèle.' },
      { title: 'Vous êtes prêt', description: 'Commencez par créer votre première classe. Vous pourrez ensuite ajouter les élèves et lancer une séance.' },
    ],
  },
  en: {
    skip: 'Skip',
    previous: 'Back',
    next: 'Next',
    finish: 'Create my first class',
    close: 'Close tutorial',
    progress: 'Step {current} of {total}',
    error: 'Your choice could not be saved. Please try again.',
    steps: [
      { title: 'Welcome to EducAssist', description: 'Keep your classes, observations, and teaching documents together in one workspace.' },
      { title: 'Create your class', description: 'Add students once, then build their records progressively after each lesson.' },
      { title: 'Add your template', description: 'Paste your school’s text template when creating the class, or upload its PDF later in class settings.' },
      { title: 'Work with the agent', description: 'Request a support plan or report card comment based on the student’s actual record and your template.' },
      { title: 'You are ready', description: 'Start by creating your first class. Then add students and launch your first lesson session.' },
    ],
  },
  es: {
    skip: 'Omitir',
    previous: 'Anterior',
    next: 'Siguiente',
    finish: 'Crear mi primera clase',
    close: 'Cerrar el tutorial',
    progress: 'Paso {current} de {total}',
    error: 'No se ha podido guardar tu elección. Inténtalo de nuevo.',
    steps: [
      { title: 'Te damos la bienvenida a EducAssist', description: 'Reúne tus clases, observaciones y documentos pedagógicos en un mismo espacio.' },
      { title: 'Crea tu clase', description: 'Añade a tus alumnos una sola vez y completa progresivamente sus expedientes después de cada sesión.' },
      { title: 'Añade tu plantilla', description: 'Pega la plantilla de texto de tu centro al crear la clase o sube después el PDF desde la configuración.' },
      { title: 'Trabaja con el agente', description: 'Solicita un PAT o un comentario de boletín basado en el expediente real del alumno y en tu plantilla.' },
      { title: 'Todo listo', description: 'Empieza creando tu primera clase. Después podrás añadir alumnos e iniciar una sesión.' },
    ],
  },
} as const

const STEP_ICONS = [LayoutDashboard, UsersRound, FileText, MessageCircle, School] as const

export default function OnboardingTour({ locale }: OnboardingTourProps) {
  const router = useRouter()
  const copy = COPY[locale]
  const [step, setStep] = useState(0)
  const [isOpen, setIsOpen] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const closingRef = useRef(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const current = copy.steps[step]
  const Icon = STEP_ICONS[step]

  const closeTour = useCallback(async (goToClass = false) => {
    if (closingRef.current) return
    closingRef.current = true
    setIsSaving(true)
    setError(null)
    try {
      const result = await markOnboardingTourSeenAction()
      if (result.error) throw new Error(result.error)
      setIsOpen(false)
      if (goToClass) router.push('/classroom')
    } catch {
      closingRef.current = false
      setIsSaving(false)
      setError(copy.error)
    }
  }, [copy.error, router])

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') void closeTour(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeTour, isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) void closeTour(false)
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-tour-title"
        aria-describedby="onboarding-tour-description"
        tabIndex={-1}
        className="w-full rounded-t-3xl border border-border bg-card p-5 shadow-2xl outline-none sm:max-w-lg sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {copy.progress.replace('{current}', String(step + 1)).replace('{total}', String(copy.steps.length))}
          </p>
          <Button type="button" size="icon" variant="ghost" onClick={() => void closeTour(false)} disabled={isSaving} aria-label={copy.close}>
            <X />
          </Button>
        </div>

        <div className="mt-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon size={30} aria-hidden="true" />
        </div>
        <h2 id="onboarding-tour-title" className="mt-5 text-2xl font-black">{current.title}</h2>
        <p id="onboarding-tour-description" className="mt-2 min-h-16 text-sm leading-6 text-muted-foreground sm:text-base">
          {current.description}
        </p>

        <div className="mt-5 flex gap-2" aria-hidden="true">
          {copy.steps.map((item, index) => (
            <span key={item.title} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => void closeTour(false)} disabled={isSaving}>
            {copy.skip}
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={() => setStep((value) => value - 1)} disabled={isSaving}>
                <ChevronLeft /> {copy.previous}
              </Button>
            )}
            {step < copy.steps.length - 1 ? (
              <Button type="button" onClick={() => setStep((value) => value + 1)} disabled={isSaving}>
                {copy.next} <ChevronRight />
              </Button>
            ) : (
              <Button type="button" onClick={() => void closeTour(true)} disabled={isSaving}>
                <Check /> {copy.finish}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
