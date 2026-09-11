'use client'

import PublicPageShell from '@/features/marketing/components/PublicPageShell'
import { usePublicLocale } from '@/features/marketing/hooks/usePublicLocale'
import LegalDraftNotice from '@/features/legal/components/LegalDraftNotice'

interface LegalSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

const COPY = {
  en: {
    eyebrow: 'TERMS',
    title: 'Terms of Use',
    description: 'The terms that govern your use of EducAssist as a teacher.',
    lastUpdated: 'Draft version — effective date to be set once reviewed and published: [DATE]',
    sections: [
      {
        heading: '1. Acceptance of these terms',
        paragraphs: [
          'By creating an account or using EducAssist, you agree to these Terms of Use and to our Privacy Policy. If you do not agree, do not use the service.',
        ],
      },
      {
        heading: '2. Description of the service',
        paragraphs: [
          'EducAssist is a web platform for teachers that helps prepare lessons, differentiate content, correct assignments, follow up on a class, and communicate with parents, with the support of artificial intelligence. It is intended for individual teachers acting in their professional capacity — not for students, parents, or the general public.',
        ],
      },
      {
        heading: '3. Account and eligibility',
        paragraphs: [
          'You must provide accurate information when creating your account and keep it up to date. You are responsible for keeping your credentials confidential and for all activity under your account. EducAssist is intended for teachers of primary, secondary, or university level, primarily in a Canadian context, though the platform does not restrict other regions.',
        ],
      },
      {
        heading: '4. Subscriptions and payment',
        paragraphs: [
          'EducAssist offers a limited free plan and a paid Pro plan (monthly or annual), billed through Stripe. Subscriptions renew automatically until cancelled. When you cancel, you keep Pro access until the end of the period already paid for, then automatically return to the free plan. If a renewal payment fails, we will notify you and attempt to charge your card again for a limited grace period before downgrading your account.',
        ],
      },
      {
        heading: '5. Ambassador discount program',
        paragraphs: [
          'Every teacher has a personal code they may share with a colleague. A colleague who subscribes to the Pro plan using that code pays full price — there is no discount for them. The teacher who owns the code instead sees their own subscription reduced by 10% for each distinct colleague who subscribes using it, cumulative up to a maximum of 100%. A code cannot be used on the account it belongs to. [TO CONFIRM WITH COUNSEL: whether any additional disclosure or consumer-protection language is required for this mechanic before launch.]',
        ],
      },
      {
        heading: '6. AI-generated content — limits and responsibility',
        paragraphs: [
          'EducAssist uses artificial intelligence to draft lesson content, adaptations, report card comments, and support plans. This content is always a starting point, never a final product: you must review, correct, and validate any AI-generated output before using it with a student, sending it to a parent, or including it in an official document. EducAssist does not guarantee that generated content is accurate, complete, or compliant with any specific curriculum or institutional requirement — that professional judgment remains yours.',
        ],
      },
      {
        heading: '7. Your responsibility for student information',
        paragraphs: [
          'You are responsible for having the appropriate authority, under your own professional and institutional obligations, to enter information about your students into EducAssist. You must not enter more student information than is reasonably necessary for the purpose you are using the platform for.',
        ],
      },
      {
        heading: '8. Acceptable use',
        bullets: [
          'No attempt to bypass usage limits, security measures, or account restrictions.',
          'No use of the service to produce illegal, defamatory, or harassing content about a student, parent, or colleague.',
          'No sharing of your account with another person.',
          'No attempt to extract, scrape, or reverse-engineer the platform or the underlying AI system.',
        ],
      },
      {
        heading: '9. Intellectual property',
        paragraphs: [
          'You retain ownership of the documents you generate and validate through EducAssist for your own teaching use. EducAssist and its underlying software, design, and branding remain the property of [LEGAL BUSINESS NAME].',
        ],
      },
      {
        heading: '10. Termination',
        paragraphs: [
          'You may stop using EducAssist and cancel your subscription at any time from your account settings. We may suspend or terminate an account that violates these terms, after reasonable notice where circumstances allow.',
        ],
      },
      {
        heading: '11. Limitation of liability',
        paragraphs: [
          '[TO BE DRAFTED WITH COUNSEL: standard limitation-of-liability language appropriate for a Québec-based SaaS handling sensitive student information, including disclaimers around AI-generated content accuracy and service availability.]',
        ],
      },
      {
        heading: '12. Governing law',
        paragraphs: [
          'These terms are governed by the laws applicable in the province of Québec, Canada. [TO CONFIRM WITH COUNSEL: dispute resolution mechanism and venue.]',
        ],
      },
      {
        heading: '13. Changes to these terms',
        paragraphs: [
          'We may update these terms as the product evolves. Material changes will be communicated before they take effect.',
        ],
      },
      {
        heading: '14. Contact us',
        paragraphs: [
          'Questions about these terms can be sent to [CONTACT EMAIL].',
        ],
      },
    ] as LegalSection[],
  },
  fr: {
    eyebrow: 'CONDITIONS',
    title: 'Conditions d’utilisation',
    description: 'Les conditions qui encadrent votre utilisation d’EducAssist en tant qu’enseignant.',
    lastUpdated: 'Version brouillon — date d’entrée en vigueur à fixer une fois révisée et publiée : [DATE]',
    sections: [
      {
        heading: '1. Acceptation des présentes conditions',
        paragraphs: [
          'En créant un compte ou en utilisant EducAssist, vous acceptez les présentes Conditions d’utilisation ainsi que notre Politique de confidentialité. Si vous n’êtes pas d’accord, n’utilisez pas le service.',
        ],
      },
      {
        heading: '2. Description du service',
        paragraphs: [
          'EducAssist est une plateforme web destinée aux enseignants qui aide à préparer des cours, différencier du contenu, corriger des copies, suivre une classe et communiquer avec les parents, avec l’appui de l’intelligence artificielle. Elle s’adresse aux enseignants agissant à titre individuel dans le cadre de leur profession — pas aux élèves, aux parents ni au grand public.',
        ],
      },
      {
        heading: '3. Compte et admissibilité',
        paragraphs: [
          'Vous devez fournir des renseignements exacts lors de la création de votre compte et les tenir à jour. Vous êtes responsable de la confidentialité de vos identifiants et de toute activité effectuée sous votre compte. EducAssist s’adresse aux enseignants du primaire, du secondaire ou de l’université, principalement dans un contexte canadien, sans que la plateforme n’exclue d’autres régions.',
        ],
      },
      {
        heading: '4. Abonnements et paiement',
        paragraphs: [
          'EducAssist propose un plan gratuit limité et un plan Pro payant (mensuel ou annuel), facturé via Stripe. Les abonnements se renouvellent automatiquement jusqu’à annulation. Lorsque vous annulez, vous conservez l’accès Pro jusqu’à la fin de la période déjà payée, puis repassez automatiquement au plan gratuit. En cas d’échec d’un paiement de renouvellement, nous vous en informerons et tenterons de débiter votre carte à nouveau pendant une période de grâce limitée avant de rétrograder votre compte.',
        ],
      },
      {
        heading: '5. Programme de réduction ambassadeur',
        paragraphs: [
          'Chaque enseignant dispose d’un code personnel qu’il peut partager avec un collègue. Un collègue qui s’abonne au plan Pro en utilisant ce code paie le plein tarif — il n’obtient aucune réduction. C’est plutôt l’enseignant propriétaire du code dont l’abonnement est réduit de 10% pour chaque collègue distinct qui s’abonne grâce à lui, cumulable jusqu’à un maximum de 100%. Un code ne peut pas être utilisé sur le compte auquel il appartient. [À CONFIRMER AVEC UN CONSEILLER JURIDIQUE : si une divulgation supplémentaire ou un encadrement de protection du consommateur est requis pour cette mécanique avant le lancement.]',
        ],
      },
      {
        heading: '6. Contenu généré par l’intelligence artificielle — limites et responsabilité',
        paragraphs: [
          'EducAssist utilise l’intelligence artificielle pour rédiger des ébauches de contenu de cours, d’adaptations, de commentaires de bulletin et de plans d’intervention. Ce contenu est toujours un point de départ, jamais un produit final : vous devez relire, corriger et valider toute sortie générée par l’IA avant de l’utiliser avec un élève, de l’envoyer à un parent ou de l’inclure dans un document officiel. EducAssist ne garantit pas que le contenu généré est exact, complet ou conforme à un programme ou une exigence institutionnelle particulière — ce jugement professionnel vous appartient.',
        ],
      },
      {
        heading: '7. Votre responsabilité concernant les renseignements sur les élèves',
        paragraphs: [
          'Vous êtes responsable de disposer de l’autorisation appropriée, en vertu de vos propres obligations professionnelles et institutionnelles, pour saisir des renseignements sur vos élèves dans EducAssist. Vous ne devez pas saisir plus de renseignements sur un élève que ce qui est raisonnablement nécessaire à l’usage que vous faites de la plateforme.',
        ],
      },
      {
        heading: '8. Utilisation acceptable',
        bullets: [
          'Aucune tentative de contourner les limites d’utilisation, les mesures de sécurité ou les restrictions de compte.',
          'Aucune utilisation du service pour produire du contenu illégal, diffamatoire ou harcelant à propos d’un élève, d’un parent ou d’un collègue.',
          'Aucun partage de votre compte avec une autre personne.',
          'Aucune tentative d’extraire, d’aspirer ou de rétro-ingénierie la plateforme ou le système d’IA sous-jacent.',
        ],
      },
      {
        heading: '9. Propriété intellectuelle',
        paragraphs: [
          'Vous conservez la propriété des documents que vous générez et validez via EducAssist pour votre propre usage pédagogique. EducAssist ainsi que le logiciel, le design et la marque sous-jacents demeurent la propriété de [RAISON SOCIALE DE L’ENTREPRISE].',
        ],
      },
      {
        heading: '10. Résiliation',
        paragraphs: [
          'Vous pouvez cesser d’utiliser EducAssist et annuler votre abonnement à tout moment depuis les paramètres de votre compte. Nous pouvons suspendre ou résilier un compte qui enfreint les présentes conditions, après un préavis raisonnable lorsque les circonstances le permettent.',
        ],
      },
      {
        heading: '11. Limitation de responsabilité',
        paragraphs: [
          '[À RÉDIGER AVEC UN CONSEILLER JURIDIQUE : clause standard de limitation de responsabilité adaptée à une plateforme SaaS québécoise traitant des renseignements sensibles sur des élèves, incluant des avertissements sur l’exactitude du contenu généré par l’IA et la disponibilité du service.]',
        ],
      },
      {
        heading: '12. Droit applicable',
        paragraphs: [
          'Les présentes conditions sont régies par les lois applicables dans la province de Québec, au Canada. [À CONFIRMER AVEC UN CONSEILLER JURIDIQUE : mécanisme de résolution des différends et juridiction compétente.]',
        ],
      },
      {
        heading: '13. Modifications des présentes conditions',
        paragraphs: [
          'Nous pouvons mettre à jour ces conditions à mesure que le produit évolue. Les changements importants seront communiqués avant leur entrée en vigueur.',
        ],
      },
      {
        heading: '14. Nous joindre',
        paragraphs: [
          'Toute question sur ces conditions peut être envoyée à [COURRIEL DE CONTACT].',
        ],
      },
    ] as LegalSection[],
  },
  es: {
    eyebrow: 'CONDICIONES',
    title: 'Condiciones de uso',
    description: 'Las condiciones que rigen su uso de EducAssist como docente.',
    lastUpdated: 'Versión borrador — fecha de entrada en vigor por definir tras la revisión y publicación: [FECHA]',
    sections: [
      {
        heading: '1. Aceptación de estas condiciones',
        paragraphs: [
          'Al crear una cuenta o utilizar EducAssist, usted acepta estas Condiciones de uso y nuestra Política de privacidad. Si no está de acuerdo, no utilice el servicio.',
        ],
      },
      {
        heading: '2. Descripción del servicio',
        paragraphs: [
          'EducAssist es una plataforma web para docentes que ayuda a preparar clases, diferenciar contenido, corregir trabajos, dar seguimiento a un grupo y comunicarse con las familias, con el apoyo de inteligencia artificial. Está destinada a docentes que actúan a título individual en el ejercicio de su profesión, no al alumnado, a las familias ni al público en general.',
        ],
      },
      {
        heading: '3. Cuenta y elegibilidad',
        paragraphs: [
          'Debe proporcionar información exacta al crear su cuenta y mantenerla actualizada. Usted es responsable de mantener la confidencialidad de sus credenciales y de toda actividad realizada bajo su cuenta. EducAssist está destinada a docentes de primaria, secundaria o universidad, principalmente en un contexto canadiense, sin que la plataforma excluya otras regiones.',
        ],
      },
      {
        heading: '4. Suscripciones y pago',
        paragraphs: [
          'EducAssist ofrece un plan gratuito limitado y un plan Pro de pago (mensual o anual), facturado a través de Stripe. Las suscripciones se renuevan automáticamente hasta que se cancelen. Al cancelar, conserva el acceso Pro hasta el final del período ya pagado y luego pasa automáticamente al plan gratuito. Si falla un pago de renovación, se lo notificaremos e intentaremos cobrar su tarjeta nuevamente durante un período de gracia limitado antes de degradar su cuenta.',
        ],
      },
      {
        heading: '5. Programa de descuento de embajadores',
        paragraphs: [
          'Cada docente dispone de un código personal que puede compartir con un colega. Un colega que se suscriba al plan Pro usando ese código paga el precio completo, sin ningún descuento. En cambio, el docente propietario del código ve su propia suscripción reducida en un 10% por cada colega distinto que se suscriba gracias a él, acumulable hasta un máximo del 100%. Un código no puede utilizarse en la cuenta a la que pertenece. [POR CONFIRMAR CON ASESORÍA LEGAL: si se requiere alguna divulgación adicional o protección al consumidor para este mecanismo antes del lanzamiento.]',
        ],
      },
      {
        heading: '6. Contenido generado por inteligencia artificial — límites y responsabilidad',
        paragraphs: [
          'EducAssist utiliza inteligencia artificial para redactar borradores de contenido de clases, adaptaciones, comentarios de boletín y planes de intervención. Este contenido es siempre un punto de partida, nunca un producto final: usted debe revisar, corregir y validar cualquier resultado generado por la IA antes de usarlo con un alumno, enviarlo a una familia o incluirlo en un documento oficial. EducAssist no garantiza que el contenido generado sea exacto, completo o conforme a un currículo o requisito institucional específico; ese criterio profesional le corresponde a usted.',
        ],
      },
      {
        heading: '7. Su responsabilidad respecto a la información del alumnado',
        paragraphs: [
          'Usted es responsable de contar con la autorización adecuada, conforme a sus propias obligaciones profesionales e institucionales, para introducir información sobre su alumnado en EducAssist. No debe introducir más información de un alumno que la razonablemente necesaria para el uso que hace de la plataforma.',
        ],
      },
      {
        heading: '8. Uso aceptable',
        bullets: [
          'No intentar eludir los límites de uso, las medidas de seguridad o las restricciones de cuenta.',
          'No utilizar el servicio para producir contenido ilegal, difamatorio o de acoso sobre un alumno, una familia o un colega.',
          'No compartir su cuenta con otra persona.',
          'No intentar extraer, raspar o realizar ingeniería inversa de la plataforma o del sistema de IA subyacente.',
        ],
      },
      {
        heading: '9. Propiedad intelectual',
        paragraphs: [
          'Usted conserva la propiedad de los documentos que genera y valida a través de EducAssist para su propio uso docente. EducAssist, así como el software, el diseño y la marca subyacentes, siguen siendo propiedad de [RAZÓN SOCIAL DE LA EMPRESA].',
        ],
      },
      {
        heading: '10. Terminación',
        paragraphs: [
          'Puede dejar de usar EducAssist y cancelar su suscripción en cualquier momento desde la configuración de su cuenta. Podemos suspender o cancelar una cuenta que infrinja estas condiciones, con aviso razonable cuando las circunstancias lo permitan.',
        ],
      },
      {
        heading: '11. Limitación de responsabilidad',
        paragraphs: [
          '[POR REDACTAR CON ASESORÍA LEGAL: cláusula estándar de limitación de responsabilidad adecuada para una plataforma SaaS con sede en Quebec que trata información sensible del alumnado, incluidas advertencias sobre la exactitud del contenido generado por IA y la disponibilidad del servicio.]',
        ],
      },
      {
        heading: '12. Ley aplicable',
        paragraphs: [
          'Estas condiciones se rigen por las leyes aplicables en la provincia de Quebec, Canadá. [POR CONFIRMAR CON ASESORÍA LEGAL: mecanismo de resolución de disputas y jurisdicción competente.]',
        ],
      },
      {
        heading: '13. Cambios a estas condiciones',
        paragraphs: [
          'Podemos actualizar estas condiciones a medida que el producto evolucione. Los cambios importantes se comunicarán antes de que entren en vigor.',
        ],
      },
      {
        heading: '14. Contáctenos',
        paragraphs: [
          'Las preguntas sobre estas condiciones pueden enviarse a [CORREO DE CONTACTO].',
        ],
      },
    ] as LegalSection[],
  },
} as const

export default function TermsOfUsePage() {
  const { locale, setLocale } = usePublicLocale()
  const t = COPY[locale]

  return (
    <PublicPageShell locale={locale} onLocaleChange={setLocale} eyebrow={t.eyebrow} title={t.title} description={t.description}>
      <div className="max-w-3xl">
        <LegalDraftNotice locale={locale} />
        <p className="mb-10 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/40">{t.lastUpdated}</p>
        <div className="space-y-10">
          {t.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-black sm:text-2xl">{section.heading}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-gray-600 dark:text-white/60 sm:text-base">
                {section.paragraphs?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                {section.bullets && (
                  <ul className="list-disc space-y-2 pl-5">
                    {section.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PublicPageShell>
  )
}
