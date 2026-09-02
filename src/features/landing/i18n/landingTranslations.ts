export type LandingLocale = 'en' | 'fr' | 'es'

export const landingTranslations = {
  en: {
    language: 'Language',
    nav: {
      features: 'Features',
      howItWorks: 'How it works',
      pricing: 'Pricing',
      login: 'Log in',
      register: 'Get started free',
      registerMobile: 'Get started',
    },
    theme: {
      light: 'Switch to light mode',
      dark: 'Switch to dark mode',
    },
    hero: {
      eyebrow: 'AI · EDUCATION · TEACHERS',
      title: 'Plan your lessons',
      titleAccent: 'in just a few clicks.',
      description:
        'Describe your lesson and your AI agent creates a complete course, a quiz, and report card comments — in under 60 seconds.',
      primaryCta: 'Create my free account →',
      demoCta: 'Watch the demo',
      generated: 'Lesson created',
      generatedSubject: 'History · Grade 12',
      generatedTopic: 'World War I',
      freeGenerations: 'free generations',
      noCard: 'No credit card required',
      quizGenerated: 'Quiz created automatically',
      questions: '8 questions',
      questionTypes: 'Multiple choice · True/False · Open-ended',
      reportComment: 'Report card comment',
      writtenIn: 'Written in 5 sec',
      reportQualities: 'Personalized · Supportive',
    },
    features: {
      title: 'Everything you need',
      subtitle: 'Three teaching tools powered by your AI agent',
      included: 'Included',
      items: [
        {
          title: 'Lesson generation',
          description:
            'A guided, zero-prompt form. Your AI agent structures and writes your complete lesson, ready to export as PDF or Word.',
        },
        {
          title: 'Automatic quizzes',
          description:
            '5 to 10 questions generated after every lesson: multiple choice, true/false, and open-ended questions with a built-in grading guide.',
        },
        {
          title: 'Report card comments',
          description:
            'Name, subject, grade, and observations — your AI agent creates a supportive, personalized, and relevant comment.',
        },
      ],
    },
    how: {
      title: 'How it works',
      subtitle: 'Ready to use in under 2 minutes',
      steps: [
        {
          n: '01',
          title: 'Create your profile',
          detail: '90 sec. Add your name, subject, and teaching level.',
        },
        {
          n: '02',
          title: 'Choose your topic',
          detail: 'Enter the title, objectives, duration, and student level.',
        },
        {
          n: '03',
          title: 'Your AI agent generates in real time',
          detail: 'Watch your complete lesson appear instantly as it is created.',
        },
        {
          n: '04',
          title: 'Export',
          detail: 'Download as PDF or Word, ready to print or share.',
        },
      ],
    },
    why: {
      eyebrow: 'BUILT ON TRUST',
      title: 'Why choose EducAssist?',
      subtitle:
        'Save time without giving up control over student data or educational decisions.',
      items: [
        {
          title: 'Student records stay private',
          description:
            'Student data is never public. Each teacher can only access students enrolled in their own classes.',
        },
        {
          title: 'Immediate time savings',
          description:
            'Turn hours of repetitive work into minutes by reusing information already recorded in your workspace.',
        },
        {
          title: 'An AI agent grounded in your class',
          description:
            'It uses existing observations, attendance, results, and adaptations. When information is missing, it says so instead of inventing it.',
        },
        {
          title: 'You stay in control',
          description:
            'Review, adjust, and approve every generated document before exporting it as DOCX or PDF.',
        },
      ],
    },
    pricing: {
      title: 'Simple pricing',
      subtitle: 'Choose the plan that fits your teaching environment',
      popular: 'Popular',
      tiers: [
        {
          name: 'Teacher Monthly',
          audience: 'For one teacher — cancel anytime',
          price: '$25',
          period: '/month',
          features: [
            'Create and manage classes and student records',
            'Attendance, observations, and assessment gradebook',
            'AI agent connected to student history',
            'Lessons, quizzes, grading, and adaptations',
            'PATs and report card comments',
            'DOCX/PDF exports and document history',
          ],
          cta: 'Subscribe',
          ctaHref: '/register',
          highlight: false,
        },
        {
          name: 'Teacher Annual',
          audience: 'For one teacher — 12 months of access',
          price: '$250',
          period: 'one payment / year',
          features: [
            'Create and manage classes and student records',
            'Attendance, observations, and assessment gradebook',
            'AI agent connected to student history',
            'Lessons, quizzes, grading, and adaptations',
            'PATs and report card comments',
            'DOCX/PDF exports and document history',
            'Save $50 compared with monthly billing',
          ],
          cta: 'Subscribe',
          ctaHref: '/register',
          highlight: true,
        },
        {
          name: 'School',
          audience: 'School leadership / Instructional coordinator',
          price: '$299',
          period: '/month',
          features: [
            'Multiple teacher accounts',
            'All individual features',
            'Centralized school management',
            'School-wide class and teacher overview',
            'Priority support',
          ],
          cta: 'Coming soon',
          ctaHref: '',
          highlight: false,
        },
        {
          name: 'District',
          audience: 'School district / Education authority',
          price: 'Custom',
          period: '',
          features: [
            'Multiple schools',
            'Centralized administration',
            'Custom deployment and onboarding',
            'Institutional security and compliance',
            'Dedicated support',
          ],
          cta: 'Contact us',
          ctaHref: '/contact',
          highlight: false,
        },
      ],
    },
    footer: {
      eyebrow: 'BUILT FOR TEACHERS',
      title: 'Less admin. More teaching.',
      description:
        'EducAssist brings your lesson planning, classroom tools, and student follow-up together in one focused workspace.',
      socials: ['Facebook', 'LinkedIn', 'YouTube', 'Instagram'],
      comingSoon: 'Coming soon',
      groups: [
        { title: 'Product', links: ['Features', 'How it works', 'Pricing'] },
        { title: 'Resources', links: ['FAQ'] },
        { title: 'Company', links: ['About us', 'Contact'] },
        { title: 'Legal', links: ['Legal notice', 'Privacy', 'Terms of use'] },
      ],
      copyright: '© 2026 EducAssist. All rights reserved.',
    },
  },
  fr: {
    language: 'Langue',
    nav: {
      features: 'Fonctionnalités',
      howItWorks: 'Comment ça marche',
      pricing: 'Tarifs',
      login: 'Se connecter',
      register: 'Commencer gratuitement',
      registerMobile: 'Commencer',
    },
    theme: {
      light: 'Passer en mode clair',
      dark: 'Passer en mode sombre',
    },
    hero: {
      eyebrow: 'IA · PÉDAGOGIE · ENSEIGNANTS',
      title: 'Préparez vos cours',
      titleAccent: 'en quelques clics.',
      description:
        "Décrivez votre séance, votre agent IA génère un cours complet, un quiz et les commentaires de bulletin — en moins de 60 secondes.",
      primaryCta: 'Créer mon compte gratuit →',
      demoCta: 'Voir la démo',
      generated: 'Cours généré',
      generatedSubject: 'Histoire · Terminale',
      generatedTopic: 'La Première Guerre mondiale',
      freeGenerations: 'générations gratuites',
      noCard: 'Sans carte bancaire',
      quizGenerated: 'Quiz auto-généré',
      questions: '8 questions',
      questionTypes: 'QCM · Vrai/Faux · Ouvertes',
      reportComment: 'Commentaire bulletin',
      writtenIn: 'Rédigé en 5 s',
      reportQualities: 'Personnalisé · Bienveillant',
    },
    features: {
      title: 'Tout ce dont vous avez besoin',
      subtitle: 'Trois outils pédagogiques propulsés par votre agent IA',
      included: 'Inclus',
      items: [
        {
          title: 'Génération de cours',
          description:
            'Un formulaire guidé, zéro prompt. Votre agent IA structure et rédige votre cours complet, exportable en PDF ou Word.',
        },
        {
          title: 'Quiz & QCM auto',
          description:
            '5 à 10 questions générées après chaque cours : QCM, vrai/faux, questions ouvertes avec barème intégré.',
        },
        {
          title: 'Commentaires bulletins',
          description:
            'Nom, matière, note, observations — votre agent IA génère un commentaire bienveillant, personnalisé et adapté.',
        },
      ],
    },
    how: {
      title: 'Comment ça marche',
      subtitle: 'Opérationnel en moins de 2 minutes',
      steps: [
        {
          n: '01',
          title: 'Créez votre profil',
          detail: '90 s. Nom, matière, niveau d’enseignement.',
        },
        {
          n: '02',
          title: 'Choisissez votre sujet',
          detail: 'Titre, objectifs, durée, niveau des élèves.',
        },
        {
          n: '03',
          title: 'Votre agent IA génère en temps réel',
          detail: 'Cours complet en streaming, visible instantanément.',
        },
        {
          n: '04',
          title: 'Exportez',
          detail: 'PDF ou Word, prêt à imprimer ou partager.',
        },
      ],
    },
    why: {
      eyebrow: 'CONÇU POUR LA CONFIANCE',
      title: 'Pourquoi choisir EducAssist ?',
      subtitle:
        'Gagnez du temps sans perdre le contrôle sur les données et les décisions pédagogiques.',
      items: [
        {
          title: 'Des dossiers élèves confidentiels',
          description:
            'Les données des élèves ne sont jamais publiques. Chaque enseignant accède uniquement aux élèves de ses propres classes.',
        },
        {
          title: 'Un gain de temps immédiat',
          description:
            'Transformez des heures de travail répétitif en quelques minutes grâce aux informations déjà enregistrées dans votre espace.',
        },
        {
          title: 'Un agent IA qui connaît votre classe',
          description:
            'Il utilise les observations, présences, résultats et adaptations existantes. Si une information manque, il le signale au lieu de l’inventer.',
        },
        {
          title: 'Vous gardez le contrôle',
          description:
            'Relisez, ajustez et validez chaque document généré avant de l’exporter en DOCX ou PDF.',
        },
      ],
    },
    pricing: {
      title: 'Tarifs simples',
      subtitle: 'Choisissez le plan adapté à votre contexte pédagogique',
      popular: 'Populaire',
      tiers: [
        {
          name: 'Enseignant mensuel',
          audience: 'Pour un enseignant — résiliable à tout moment',
          price: '25 $',
          period: '/mois',
          features: [
            'Création et gestion des classes et des dossiers élèves',
            'Présences, observations et carnet de résultats',
            'Agent IA connecté à l’historique des élèves',
            'Cours, quiz, corrections et adaptations',
            'PAT et commentaires de bulletin',
            'Exports DOCX/PDF et historique des documents',
          ],
          cta: 'S’abonner',
          ctaHref: '/register',
          highlight: false,
        },
        {
          name: 'Enseignant annuel',
          audience: 'Pour un enseignant — accès pendant 12 mois',
          price: '250 $',
          period: 'un paiement / an',
          features: [
            'Création et gestion des classes et des dossiers élèves',
            'Présences, observations et carnet de résultats',
            'Agent IA connecté à l’historique des élèves',
            'Cours, quiz, corrections et adaptations',
            'PAT et commentaires de bulletin',
            'Exports DOCX/PDF et historique des documents',
            '50 $ économisés par rapport au paiement mensuel',
          ],
          cta: 'S’abonner',
          ctaHref: '/register',
          highlight: true,
        },
        {
          name: 'Établissement',
          audience: 'Direction / Coordinateur pédagogique',
          price: '299 $',
          period: '/mois',
          features: [
            'Plusieurs comptes enseignants',
            'Toutes les fonctionnalités individuelles',
            'Gestion centralisée de l’établissement',
            'Vue globale des classes et des enseignants',
            'Assistance prioritaire',
          ],
          cta: 'Bientôt disponible',
          ctaHref: '',
          highlight: false,
        },
        {
          name: 'District',
          audience: 'Commission scolaire / Académie',
          price: 'Sur devis',
          period: '',
          features: [
            'Plusieurs établissements',
            'Administration centralisée',
            'Déploiement et accompagnement personnalisés',
            'Sécurité et conformité institutionnelles',
            'Support dédié',
          ],
          cta: 'Nous contacter',
          ctaHref: '/contact',
          highlight: false,
        },
      ],
    },
    footer: {
      eyebrow: 'PENSÉ POUR LES ENSEIGNANTS',
      title: 'Moins d’administratif. Plus de pédagogie.',
      description:
        'EducAssist réunit la préparation des cours, les outils de classe et le suivi des élèves dans un espace simple et cohérent.',
      socials: ['Facebook', 'LinkedIn', 'YouTube', 'Instagram'],
      comingSoon: 'Bientôt disponible',
      groups: [
        { title: 'Produit', links: ['Fonctionnalités', 'Comment ça marche', 'Tarifs'] },
        { title: 'Ressources', links: ['FAQ'] },
        { title: 'Entreprise', links: ['À propos', 'Contact'] },
        { title: 'Légal', links: ['Mentions légales', 'Confidentialité', 'Conditions d’utilisation'] },
      ],
      copyright: '© 2026 EducAssist. Tous droits réservés.',
    },
  },
  es: {
    language: 'Idioma',
    nav: {
      features: 'Funciones',
      howItWorks: 'Cómo funciona',
      pricing: 'Precios',
      login: 'Iniciar sesión',
      register: 'Empezar gratis',
      registerMobile: 'Empezar',
    },
    theme: {
      light: 'Cambiar al modo claro',
      dark: 'Cambiar al modo oscuro',
    },
    hero: {
      eyebrow: 'IA · EDUCACIÓN · DOCENTES',
      title: 'Prepara tus clases',
      titleAccent: 'en unos pocos clics.',
      description:
        'Describe tu clase y tu agente de IA crea una lección completa, un quiz y comentarios de evaluación en menos de 60 segundos.',
      primaryCta: 'Crear mi cuenta gratis →',
      demoCta: 'Ver la demostración',
      generated: 'Lección creada',
      generatedSubject: 'Historia · Bachillerato',
      generatedTopic: 'La Primera Guerra Mundial',
      freeGenerations: 'generaciones gratuitas',
      noCard: 'Sin tarjeta bancaria',
      quizGenerated: 'Quiz generado automáticamente',
      questions: '8 preguntas',
      questionTypes: 'Opción múltiple · Verdadero/Falso · Abiertas',
      reportComment: 'Comentario de evaluación',
      writtenIn: 'Redactado en 5 s',
      reportQualities: 'Personalizado · Cercano',
    },
    features: {
      title: 'Todo lo que necesitas',
      subtitle: 'Tres herramientas docentes impulsadas por tu agente de IA',
      included: 'Incluido',
      items: [
        {
          title: 'Generación de lecciones',
          description:
            'Un formulario guiado, sin escribir prompts. Tu agente de IA estructura y redacta tu lección completa, lista para exportar en PDF o Word.',
        },
        {
          title: 'Quizzes automáticos',
          description:
            'De 5 a 10 preguntas generadas después de cada lección: opción múltiple, verdadero/falso y preguntas abiertas con guía de evaluación.',
        },
        {
          title: 'Comentarios de evaluación',
          description:
            'Nombre, materia, nota y observaciones: tu agente de IA crea un comentario cercano, personalizado y pertinente.',
        },
      ],
    },
    how: {
      title: 'Cómo funciona',
      subtitle: 'Listo para usar en menos de 2 minutos',
      steps: [
        { n: '01', title: 'Crea tu perfil', detail: '90 s. Añade tu nombre, materia y nivel educativo.' },
        { n: '02', title: 'Elige el tema', detail: 'Indica título, objetivos, duración y nivel del alumnado.' },
        { n: '03', title: 'Tu agente de IA genera en tiempo real', detail: 'Observa cómo aparece la lección completa mientras se crea.' },
        { n: '04', title: 'Exporta', detail: 'Descarga en PDF o Word, listo para imprimir o compartir.' },
      ],
    },
    why: {
      eyebrow: 'DISEÑADO PARA GENERAR CONFIANZA',
      title: '¿Por qué elegir EducAssist?',
      subtitle:
        'Ahorra tiempo sin perder el control de los datos del alumnado ni de tus decisiones educativas.',
      items: [
        {
          title: 'Expedientes del alumnado confidenciales',
          description:
            'Los datos del alumnado nunca son públicos. Cada docente solo accede al alumnado de sus propias clases.',
        },
        {
          title: 'Ahorro de tiempo inmediato',
          description:
            'Convierte horas de trabajo repetitivo en minutos reutilizando la información ya registrada en tu espacio.',
        },
        {
          title: 'Un agente de IA que conoce tu clase',
          description:
            'Utiliza las observaciones, asistencias, resultados y adaptaciones existentes. Si falta información, lo indica en lugar de inventarla.',
        },
        {
          title: 'Tú mantienes el control',
          description:
            'Revisa, ajusta y aprueba cada documento generado antes de exportarlo en DOCX o PDF.',
        },
      ],
    },
    pricing: {
      title: 'Precios sencillos',
      subtitle: 'Elige el plan que mejor se adapte a tu entorno educativo',
      popular: 'Popular',
      tiers: [
        {
          name: 'Docente mensual',
          audience: 'Para un docente — cancela cuando quieras',
          price: '25 $',
          period: '/mes',
          features: [
            'Creación y gestión de clases y expedientes del alumnado',
            'Asistencia, observaciones y registro de resultados',
            'Agente de IA conectado al historial del alumnado',
            'Lecciones, quizzes, correcciones y adaptaciones',
            'PAT y comentarios de evaluación',
            'Exportaciones DOCX/PDF e historial de documentos',
          ],
          cta: 'Suscribirme',
          ctaHref: '/register',
          highlight: false,
        },
        {
          name: 'Docente anual',
          audience: 'Para un docente — acceso durante 12 meses',
          price: '250 $',
          period: 'un pago / año',
          features: [
            'Creación y gestión de clases y expedientes del alumnado',
            'Asistencia, observaciones y registro de resultados',
            'Agente de IA conectado al historial del alumnado',
            'Lecciones, quizzes, correcciones y adaptaciones',
            'PAT y comentarios de evaluación',
            'Exportaciones DOCX/PDF e historial de documentos',
            'Ahorra 50 $ frente al pago mensual',
          ],
          cta: 'Suscribirme',
          ctaHref: '/register',
          highlight: true,
        },
        {
          name: 'Centro',
          audience: 'Dirección / Coordinación pedagógica',
          price: '299 $',
          period: '/mes',
          features: [
            'Varias cuentas docentes',
            'Todas las funciones individuales',
            'Gestión centralizada del centro',
            'Vista global de clases y docentes',
            'Asistencia prioritaria',
          ],
          cta: 'Próximamente',
          ctaHref: '',
          highlight: false,
        },
        {
          name: 'Distrito',
          audience: 'Distrito escolar / Administración educativa',
          price: 'A medida',
          period: '',
          features: [
            'Varios centros educativos',
            'Administración centralizada',
            'Despliegue y acompañamiento personalizados',
            'Seguridad y cumplimiento institucional',
            'Soporte dedicado',
          ],
          cta: 'Contactar',
          ctaHref: '/contact',
          highlight: false,
        },
      ],
    },
    footer: {
      eyebrow: 'CREADO PARA DOCENTES',
      title: 'Menos administración. Más enseñanza.',
      description:
        'EducAssist reúne la planificación, las herramientas de aula y el seguimiento del alumnado en un espacio sencillo y coherente.',
      socials: ['Facebook', 'LinkedIn', 'YouTube', 'Instagram'],
      comingSoon: 'Próximamente',
      groups: [
        { title: 'Producto', links: ['Funciones', 'Cómo funciona', 'Precios'] },
        { title: 'Recursos', links: ['FAQ'] },
        { title: 'Empresa', links: ['Quiénes somos', 'Contacto'] },
        { title: 'Legal', links: ['Aviso legal', 'Privacidad', 'Condiciones de uso'] },
      ],
      copyright: '© 2026 EducAssist. Todos los derechos reservados.',
    },
  },
} as const
