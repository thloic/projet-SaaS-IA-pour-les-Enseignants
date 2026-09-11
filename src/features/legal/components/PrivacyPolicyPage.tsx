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
    eyebrow: 'PRIVACY',
    title: 'Privacy Policy',
    description: 'How EducAssist collects, uses, and protects personal information — including information about students entered by teachers.',
    lastUpdated: 'Draft version — effective date to be set once reviewed and published: [DATE]',
    sections: [
      {
        heading: '1. Who we are',
        paragraphs: [
          '[LEGAL BUSINESS NAME], operating EducAssist ("EducAssist", "we", "us"), provides a web platform for teachers ("Practitioner Account Holder" or "you") to prepare lessons, correct assignments, adapt content, track a class, and communicate with parents, with the support of artificial intelligence.',
          'This policy applies to personal information processed through educassist360.com and its related application. It is written in plain language on purpose; it is not a substitute for the full legal text your lawyer will finalize.',
        ],
      },
      {
        heading: '2. What we collect',
        paragraphs: [
          'Account information you provide directly: name, email address, country, subject(s) taught, grade level(s), grading system, and interface/content language preferences.',
          'Student information you enter as a teacher: first and last name, sex, family language, learning needs, institutional adaptations, whether the student has an intervention plan, general notes, attendance, participation, observations, evaluation results, and any document generated about that student (report card comments, support plans).',
          'Billing information: handled directly by our payment processor, Stripe. We never receive or store your card number — only the subscription status, billing interval, and next renewal date.',
          'Usage information: how many AI generations you use each month (to apply free-plan limits), and general product analytics (pages visited, features used) collected in an aggregated form.',
        ],
      },
      {
        heading: '3. Why we collect it',
        bullets: [
          'To provide the core service: generate lesson content, adaptations, report card comments, and support plans tailored to your students and teaching context.',
          'To operate your account: authentication, class and student record-keeping, free/paid plan enforcement.',
          'To process payment and manage your subscription, including the ambassador discount program.',
          'To send you service-related communications (receipts, account notices) and, where you have agreed, product updates.',
          'To maintain and improve the reliability and security of the service.',
        ],
      },
      {
        heading: '4. How artificial intelligence is used',
        paragraphs: [
          'EducAssist uses a third-party AI model (currently Anthropic\'s Claude) to generate lesson content, adaptations, and document drafts. When you ask the assistant a question or request a document, the relevant context — your teaching profile and the specific student or class information needed to answer accurately — is sent to that AI provider to produce a response.',
          'Your data is never used to train the underlying AI models. Every AI-generated output is a draft: it is always presented to you for review before you use, send, or publish it. EducAssist does not make automated decisions about a student without your review and validation.',
        ],
      },
      {
        heading: '5. Who we share information with',
        paragraphs: [
          'We do not sell personal information. We share it only with the service providers ("sub-processors") strictly necessary to operate EducAssist, each bound by its own data protection terms:',
        ],
        bullets: [
          'Supabase — database hosting, authentication, and file storage. Hosting region: [TO CONFIRM].',
          'Anthropic — AI model provider used to generate content (see section 4).',
          'Stripe — payment processing and subscription billing.',
          'Resend — transactional email delivery (receipts, account notices).',
          'PostHog — product usage analytics, in aggregated/anonymized form where possible.',
          'Vercel — application hosting.',
        ],
      },
      {
        heading: '6. Cross-border data transfers',
        paragraphs: [
          'Some of the providers listed above may process or store information outside Québec. [TO CONFIRM WITH COUNSEL: a transfer impact assessment is required under Law 25 before personal information is transferred outside Québec; this section must list the assessment outcome and any contractual safeguards in place before publication.]',
        ],
      },
      {
        heading: '7. How we protect information',
        bullets: [
          'Encryption in transit (TLS) and at rest.',
          'Row Level Security on every database table containing personal or student information: an account only ever accesses its own data.',
          'Short authentication sessions with silent renewal.',
          'Card numbers never pass through our servers — payment happens on Stripe\'s own secure checkout.',
        ],
      },
      {
        heading: '8. How long we keep information',
        paragraphs: [
          'We keep account and student information for as long as your account is active. [TO CONFIRM: exact retention period after account closure or cancellation, and the process/timeline for permanent deletion, to be set with counsel and reflected in the product\'s account-deletion flow.]',
        ],
      },
      {
        heading: '9. Your rights',
        paragraphs: [
          'Subject to applicable law, you may request access to, correction of, or deletion of the personal information we hold about you or that you entered about your students, as well as a copy of it in a usable format (data portability). To exercise these rights, contact [PRIVACY CONTACT EMAIL]. We will respond within the timeframe required by law.',
        ],
      },
      {
        heading: '10. Students and minors',
        paragraphs: [
          'EducAssist accounts are held by teachers, not by students. Students do not create their own accounts or provide information directly to us. The teacher (and their school, where applicable) is responsible for having the appropriate authority to enter student information into the platform in accordance with their own obligations as an educator or institution. EducAssist acts as a technical service provider processing that information on the teacher\'s instructions.',
        ],
      },
      {
        heading: '11. Confidentiality incidents',
        paragraphs: [
          'If a confidentiality incident presents a risk of serious harm, we will notify the Commission d\'accès à l\'information du Québec and the affected individuals, in accordance with Law 25, and take reasonable steps to reduce the risk of harm.',
        ],
      },
      {
        heading: '12. Cookies and similar technologies',
        paragraphs: [
          'We use essential cookies to keep you signed in, and analytics tooling (PostHog) to understand how the product is used. [TO CONFIRM: full cookie list and consent mechanism once analytics configuration is finalized.]',
        ],
      },
      {
        heading: '13. Changes to this policy',
        paragraphs: [
          'We may update this policy as the product evolves. Material changes will be communicated before they take effect.',
        ],
      },
      {
        heading: '14. Contact us',
        paragraphs: [
          'Questions about this policy or your personal information can be sent to [PRIVACY CONTACT EMAIL]. [Privacy officer name/title to be designated, as required by Law 25.]',
        ],
      },
    ] as LegalSection[],
  },
  fr: {
    eyebrow: 'CONFIDENTIALITÉ',
    title: 'Politique de confidentialité',
    description: 'Comment EducAssist recueille, utilise et protège les renseignements personnels — y compris les renseignements sur les élèves saisis par les enseignants.',
    lastUpdated: 'Version brouillon — date d’entrée en vigueur à fixer une fois révisée et publiée : [DATE]',
    sections: [
      {
        heading: '1. Qui nous sommes',
        paragraphs: [
          '[RAISON SOCIALE DE L’ENTREPRISE], exploitant EducAssist (« EducAssist », « nous »), propose une plateforme web destinée aux enseignants (« vous ») pour préparer des cours, corriger des copies, adapter du contenu, suivre une classe et communiquer avec les parents, avec l’appui de l’intelligence artificielle.',
          'Cette politique s’applique aux renseignements personnels traités via educassist360.com et l’application qui y est associée. Elle est rédigée en langage clair volontairement ; elle ne remplace pas le texte juridique final que votre avocat finalisera.',
        ],
      },
      {
        heading: '2. Ce que nous recueillons',
        paragraphs: [
          'Renseignements de compte fournis directement par vous : nom, adresse courriel, pays, matière(s) enseignée(s), niveau(x), système de notation et préférences de langue d’interface/de contenu.',
          'Renseignements sur les élèves que vous saisissez en tant qu’enseignant : prénom et nom, sexe, langue familiale, besoins d’apprentissage, adaptations institutionnelles, présence ou non d’un plan d’intervention, notes générales, présences, participation, observations, résultats d’évaluation, et tout document généré à propos de cet élève (commentaires de bulletin, plans d’intervention).',
          'Renseignements de facturation : traités directement par notre processeur de paiement, Stripe. Nous ne recevons ni ne conservons jamais votre numéro de carte — seulement le statut de l’abonnement, la fréquence de facturation et la prochaine date de renouvellement.',
          'Renseignements d’utilisation : le nombre de générations IA utilisées chaque mois (pour appliquer les limites du plan gratuit), et des statistiques générales d’usage du produit (pages visitées, fonctionnalités utilisées) recueillies sous forme agrégée.',
        ],
      },
      {
        heading: '3. Pourquoi nous les recueillons',
        bullets: [
          'Pour fournir le service principal : générer du contenu de cours, des adaptations, des commentaires de bulletin et des plans d’intervention adaptés à vos élèves et à votre contexte d’enseignement.',
          'Pour faire fonctionner votre compte : authentification, tenue des dossiers de classe et d’élèves, application des limites des plans gratuit/payant.',
          'Pour traiter le paiement et gérer votre abonnement, y compris le programme de réduction ambassadeur.',
          'Pour vous envoyer des communications liées au service (reçus, avis de compte) et, lorsque vous y avez consenti, des mises à jour du produit.',
          'Pour maintenir et améliorer la fiabilité et la sécurité du service.',
        ],
      },
      {
        heading: '4. Comment l’intelligence artificielle est utilisée',
        paragraphs: [
          'EducAssist utilise un modèle d’intelligence artificielle tiers (actuellement Claude, d’Anthropic) pour générer du contenu de cours, des adaptations et des ébauches de documents. Quand vous posez une question à l’assistant ou demandez un document, le contexte nécessaire — votre profil enseignant et les renseignements précis sur l’élève ou la classe requis pour répondre correctement — est transmis à ce fournisseur d’IA pour produire une réponse.',
          'Vos données ne servent jamais à entraîner les modèles d’IA sous-jacents. Toute sortie générée par l’IA est une ébauche : elle vous est toujours présentée pour relecture avant que vous l’utilisiez, l’envoyiez ou la publiiez. EducAssist ne prend aucune décision automatisée concernant un élève sans votre relecture et votre validation.',
        ],
      },
      {
        heading: '5. Avec qui nous partageons les renseignements',
        paragraphs: [
          'Nous ne vendons jamais de renseignements personnels. Nous les partageons uniquement avec les fournisseurs de services (« sous-traitants ») strictement nécessaires au fonctionnement d’EducAssist, chacun lié par ses propres conditions de protection des données :',
        ],
        bullets: [
          'Supabase — hébergement de la base de données, authentification et stockage de fichiers. Région d’hébergement : [À CONFIRMER].',
          'Anthropic — fournisseur du modèle d’IA utilisé pour générer le contenu (voir section 4).',
          'Stripe — traitement des paiements et facturation des abonnements.',
          'Resend — envoi des courriels transactionnels (reçus, avis de compte).',
          'PostHog — statistiques d’utilisation du produit, sous forme agrégée/anonymisée dans la mesure du possible.',
          'Vercel — hébergement de l’application.',
        ],
      },
      {
        heading: '6. Transferts de données hors Québec',
        paragraphs: [
          'Certains fournisseurs mentionnés ci-dessus peuvent traiter ou conserver des renseignements hors Québec. [À CONFIRMER AVEC UN CONSEILLER JURIDIQUE : une évaluation des facteurs relatifs à la vie privée est requise en vertu de la Loi 25 avant tout transfert de renseignements personnels hors Québec ; cette section doit préciser le résultat de cette évaluation et les mesures contractuelles en place avant publication.]',
        ],
      },
      {
        heading: '7. Comment nous protégeons les renseignements',
        bullets: [
          'Chiffrement en transit (TLS) et au repos.',
          'Sécurité au niveau des lignes (RLS) activée sur chaque table de base de données contenant des renseignements personnels ou d’élèves : un compte n’accède jamais qu’à ses propres données.',
          'Sessions d’authentification courtes avec renouvellement silencieux.',
          'Les numéros de carte ne transitent jamais par nos serveurs — le paiement se fait directement sur la page de paiement sécurisée de Stripe.',
        ],
      },
      {
        heading: '8. Durée de conservation',
        paragraphs: [
          'Nous conservons les renseignements de compte et d’élèves tant que votre compte est actif. [À CONFIRMER : durée exacte de conservation après la fermeture ou l’annulation du compte, et le processus/délai de suppression définitive, à déterminer avec un conseiller juridique et à refléter dans le parcours de suppression de compte du produit.]',
        ],
      },
      {
        heading: '9. Vos droits',
        paragraphs: [
          'Sous réserve du droit applicable, vous pouvez demander l’accès, la rectification ou la suppression des renseignements personnels que nous détenons à votre sujet ou que vous avez saisis au sujet de vos élèves, ainsi qu’une copie de ceux-ci dans un format utilisable (portabilité des données). Pour exercer ces droits, écrivez à [COURRIEL DE CONTACT VIE PRIVÉE]. Nous répondrons dans le délai prévu par la loi.',
        ],
      },
      {
        heading: '10. Élèves et mineurs',
        paragraphs: [
          'Les comptes EducAssist sont détenus par des enseignants, jamais par des élèves. Les élèves ne créent pas de compte et ne nous fournissent aucun renseignement directement. L’enseignant (et son établissement, le cas échéant) est responsable de disposer de l’autorisation nécessaire pour saisir des renseignements sur ses élèves dans la plateforme, conformément à ses propres obligations d’éducateur ou d’établissement. EducAssist agit comme fournisseur de services technique traitant ces renseignements sur instruction de l’enseignant.',
        ],
      },
      {
        heading: '11. Incidents de confidentialité',
        paragraphs: [
          'En cas d’incident de confidentialité présentant un risque de préjudice sérieux, nous en aviserons la Commission d’accès à l’information du Québec et les personnes concernées, conformément à la Loi 25, et prendrons des mesures raisonnables pour réduire le risque de préjudice.',
        ],
      },
      {
        heading: '12. Témoins et technologies similaires',
        paragraphs: [
          'Nous utilisons des témoins essentiels pour maintenir votre session ouverte, ainsi qu’un outil d’analyse (PostHog) pour comprendre l’usage du produit. [À CONFIRMER : liste complète des témoins et mécanisme de consentement une fois la configuration analytique finalisée.]',
        ],
      },
      {
        heading: '13. Modifications de cette politique',
        paragraphs: [
          'Nous pouvons mettre à jour cette politique à mesure que le produit évolue. Les changements importants seront communiqués avant leur entrée en vigueur.',
        ],
      },
      {
        heading: '14. Nous joindre',
        paragraphs: [
          'Toute question sur cette politique ou sur vos renseignements personnels peut être envoyée à [COURRIEL DE CONTACT VIE PRIVÉE]. [Nom/titre du responsable de la protection des renseignements personnels à désigner, comme l’exige la Loi 25.]',
        ],
      },
    ] as LegalSection[],
  },
  es: {
    eyebrow: 'PRIVACIDAD',
    title: 'Política de privacidad',
    description: 'Cómo EducAssist recopila, utiliza y protege la información personal, incluida la información sobre el alumnado introducida por el profesorado.',
    lastUpdated: 'Versión borrador — fecha de entrada en vigor por definir tras la revisión y publicación: [FECHA]',
    sections: [
      {
        heading: '1. Quiénes somos',
        paragraphs: [
          '[RAZÓN SOCIAL DE LA EMPRESA], que opera EducAssist ("EducAssist", "nosotros"), ofrece una plataforma web para que el profesorado ("usted") prepare clases, corrija trabajos, adapte contenido, dé seguimiento a un grupo y se comunique con las familias, con el apoyo de inteligencia artificial.',
          'Esta política se aplica a la información personal tratada a través de educassist360.com y la aplicación asociada. Está redactada en lenguaje sencillo de forma intencional; no sustituye el texto legal final que su abogado finalizará.',
        ],
      },
      {
        heading: '2. Qué recopilamos',
        paragraphs: [
          'Información de la cuenta que usted proporciona directamente: nombre, correo electrónico, país, materia(s) impartida(s), nivel(es), sistema de calificación y preferencias de idioma de interfaz/contenido.',
          'Información del alumnado que usted introduce como docente: nombre y apellido, sexo, lengua familiar, necesidades de aprendizaje, adaptaciones institucionales, si el alumno cuenta con un plan de intervención, notas generales, asistencia, participación, observaciones, resultados de evaluación y cualquier documento generado sobre ese alumno (comentarios de boletín, planes de intervención).',
          'Información de facturación: gestionada directamente por nuestro procesador de pagos, Stripe. Nunca recibimos ni almacenamos su número de tarjeta, solo el estado de la suscripción, la frecuencia de facturación y la próxima fecha de renovación.',
          'Información de uso: el número de generaciones de IA utilizadas cada mes (para aplicar los límites del plan gratuito) y estadísticas generales de uso del producto (páginas visitadas, funciones utilizadas) recopiladas de forma agregada.',
        ],
      },
      {
        heading: '3. Por qué la recopilamos',
        bullets: [
          'Para prestar el servicio principal: generar contenido de clases, adaptaciones, comentarios de boletín y planes de intervención adaptados a su alumnado y a su contexto docente.',
          'Para operar su cuenta: autenticación, gestión de registros de clase y alumnado, aplicación de los límites de los planes gratuito/de pago.',
          'Para procesar el pago y gestionar su suscripción, incluido el programa de descuento de embajadores.',
          'Para enviarle comunicaciones relacionadas con el servicio (recibos, avisos de cuenta) y, cuando haya dado su consentimiento, novedades del producto.',
          'Para mantener y mejorar la fiabilidad y la seguridad del servicio.',
        ],
      },
      {
        heading: '4. Cómo se utiliza la inteligencia artificial',
        paragraphs: [
          'EducAssist utiliza un modelo de inteligencia artificial de terceros (actualmente Claude, de Anthropic) para generar contenido de clases, adaptaciones y borradores de documentos. Cuando hace una pregunta al asistente o solicita un documento, el contexto necesario —su perfil docente y la información específica del alumno o del grupo requerida para responder correctamente— se envía a ese proveedor de IA para producir una respuesta.',
          'Sus datos nunca se utilizan para entrenar los modelos de IA subyacentes. Todo resultado generado por la IA es un borrador: siempre se le presenta para su revisión antes de que lo use, lo envíe o lo publique. EducAssist no toma ninguna decisión automatizada sobre un alumno sin su revisión y validación.',
        ],
      },
      {
        heading: '5. Con quién compartimos la información',
        paragraphs: [
          'Nunca vendemos información personal. Solo la compartimos con los proveedores de servicios ("subencargados") estrictamente necesarios para operar EducAssist, cada uno sujeto a sus propias condiciones de protección de datos:',
        ],
        bullets: [
          'Supabase: alojamiento de la base de datos, autenticación y almacenamiento de archivos. Región de alojamiento: [POR CONFIRMAR].',
          'Anthropic: proveedor del modelo de IA utilizado para generar contenido (véase la sección 4).',
          'Stripe: procesamiento de pagos y facturación de suscripciones.',
          'Resend: envío de correos transaccionales (recibos, avisos de cuenta).',
          'PostHog: estadísticas de uso del producto, de forma agregada/anonimizada en la medida de lo posible.',
          'Vercel: alojamiento de la aplicación.',
        ],
      },
      {
        heading: '6. Transferencias de datos fuera de Quebec',
        paragraphs: [
          'Algunos de los proveedores mencionados arriba pueden tratar o almacenar información fuera de Quebec. [POR CONFIRMAR CON ASESORÍA LEGAL: la Ley 25 exige una evaluación de impacto antes de transferir información personal fuera de Quebec; esta sección debe indicar el resultado de dicha evaluación y las garantías contractuales vigentes antes de la publicación.]',
        ],
      },
      {
        heading: '7. Cómo protegemos la información',
        bullets: [
          'Cifrado en tránsito (TLS) y en reposo.',
          'Seguridad a nivel de fila (RLS) activada en cada tabla de la base de datos que contenga información personal o del alumnado: una cuenta solo accede a sus propios datos.',
          'Sesiones de autenticación cortas con renovación silenciosa.',
          'Los números de tarjeta nunca pasan por nuestros servidores: el pago se realiza directamente en la página segura de Stripe.',
        ],
      },
      {
        heading: '8. Cuánto tiempo conservamos la información',
        paragraphs: [
          'Conservamos la información de la cuenta y del alumnado mientras su cuenta esté activa. [POR CONFIRMAR: plazo exacto de conservación tras el cierre o la cancelación de la cuenta, y el proceso/plazo de eliminación definitiva, a determinar con asesoría legal y a reflejar en el flujo de eliminación de cuenta del producto.]',
        ],
      },
      {
        heading: '9. Sus derechos',
        paragraphs: [
          'Sujeto a la ley aplicable, puede solicitar el acceso, la rectificación o la eliminación de la información personal que conservamos sobre usted o que usted introdujo sobre su alumnado, así como una copia de la misma en un formato utilizable (portabilidad de datos). Para ejercer estos derechos, escriba a [CORREO DE CONTACTO DE PRIVACIDAD]. Responderemos en el plazo previsto por la ley.',
        ],
      },
      {
        heading: '10. Alumnado y menores',
        paragraphs: [
          'Las cuentas de EducAssist son propiedad del profesorado, nunca del alumnado. El alumnado no crea sus propias cuentas ni nos proporciona información directamente. El docente (y su institución, en su caso) es responsable de contar con la autorización necesaria para introducir información del alumnado en la plataforma, conforme a sus propias obligaciones como educador o institución. EducAssist actúa como proveedor de servicios técnicos que trata esa información por instrucción del docente.',
        ],
      },
      {
        heading: '11. Incidentes de confidencialidad',
        paragraphs: [
          'En caso de un incidente de confidencialidad que presente un riesgo de daño grave, notificaremos a la Commission d’accès à l’information du Québec y a las personas afectadas, conforme a la Ley 25, y tomaremos medidas razonables para reducir el riesgo de daño.',
        ],
      },
      {
        heading: '12. Cookies y tecnologías similares',
        paragraphs: [
          'Utilizamos cookies esenciales para mantener su sesión iniciada, así como una herramienta de análisis (PostHog) para entender el uso del producto. [POR CONFIRMAR: lista completa de cookies y mecanismo de consentimiento una vez finalizada la configuración analítica.]',
        ],
      },
      {
        heading: '13. Cambios a esta política',
        paragraphs: [
          'Podemos actualizar esta política a medida que el producto evolucione. Los cambios importantes se comunicarán antes de que entren en vigor.',
        ],
      },
      {
        heading: '14. Contáctenos',
        paragraphs: [
          'Las preguntas sobre esta política o sobre su información personal pueden enviarse a [CORREO DE CONTACTO DE PRIVACIDAD]. [Nombre/cargo del responsable de protección de datos por designar, según lo exige la Ley 25.]',
        ],
      },
    ] as LegalSection[],
  },
} as const

export default function PrivacyPolicyPage() {
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
