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
        'Describe your lesson and AI creates a complete course, a quiz, and report card comments — in under 60 seconds.',
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
      subtitle: 'Three AI-powered teaching tools',
      included: 'Included',
      items: [
        {
          title: 'Lesson generation',
          description:
            'A guided, zero-prompt form. AI structures and writes your complete lesson, ready to export as PDF or Word.',
        },
        {
          title: 'Automatic quizzes',
          description:
            '5 to 10 questions generated after every lesson: multiple choice, true/false, and open-ended questions with a built-in grading guide.',
        },
        {
          title: 'Report card comments',
          description:
            'Name, subject, grade, and observations — AI creates a supportive, personalized, and relevant comment.',
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
          title: 'AI generates in real time',
          detail: 'Watch your complete lesson appear instantly as it is created.',
        },
        {
          n: '04',
          title: 'Export',
          detail: 'Download as PDF or Word, ready to print or share.',
        },
      ],
    },
    pricing: {
      title: 'Simple pricing',
      subtitle: 'Choose the plan that fits your teaching environment',
      popular: 'Popular',
      tiers: [
        {
          name: 'Starter',
          audience: 'Independent teacher',
          price: '$20',
          period: '/month',
          features: ['Modules 1 to 4', 'Grading + planning'],
          cta: 'Join the waitlist',
          highlight: false,
        },
        {
          name: 'Pro',
          audience: 'School teacher',
          price: '$39',
          period: '/month',
          features: ['All 5 modules', 'Integrated dashboard'],
          cta: 'Join the waitlist',
          highlight: false,
        },
        {
          name: 'Annual Pro',
          audience: 'Teacher — 12-month access',
          price: '$250',
          period: 'one-time / year',
          features: ['All features included', '12 months of access', 'One annual payment'],
          cta: 'Join the waitlist',
          highlight: true,
        },
        {
          name: 'School',
          audience: 'School leadership / Instructional coordinator',
          price: '$299',
          period: '/month',
          features: ['Every teacher in your school', 'Leadership analytics', 'Integrations'],
          cta: 'Join the waitlist',
          highlight: false,
        },
        {
          name: 'District',
          audience: 'School district / Education authority',
          price: 'Custom',
          period: '',
          features: ['Multi-school deployment', 'Institutional compliance'],
          cta: 'Contact us',
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
        "Décrivez votre séance, l’IA génère un cours complet, un quiz et les commentaires de bulletin — en moins de 60 secondes.",
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
      subtitle: 'Trois outils pédagogiques propulsés par l’IA',
      included: 'Inclus',
      items: [
        {
          title: 'Génération de cours',
          description:
            'Un formulaire guidé, zéro prompt. L’IA structure et rédige votre cours complet, exportable en PDF ou Word.',
        },
        {
          title: 'Quiz & QCM auto',
          description:
            '5 à 10 questions générées après chaque cours : QCM, vrai/faux, questions ouvertes avec barème intégré.',
        },
        {
          title: 'Commentaires bulletins',
          description:
            'Nom, matière, note, observations — l’IA génère un commentaire bienveillant, personnalisé et adapté.',
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
          title: 'L’IA génère en temps réel',
          detail: 'Cours complet en streaming, visible instantanément.',
        },
        {
          n: '04',
          title: 'Exportez',
          detail: 'PDF ou Word, prêt à imprimer ou partager.',
        },
      ],
    },
    pricing: {
      title: 'Tarifs simples',
      subtitle: 'Choisissez le plan adapté à votre contexte pédagogique',
      popular: 'Populaire',
      tiers: [
        {
          name: 'Starter',
          audience: 'Enseignant indépendant',
          price: '20 $',
          period: '/mois',
          features: ['Modules 1 à 4', 'Correction + planification'],
          cta: 'Rejoindre la liste d’attente',
          highlight: false,
        },
        {
          name: 'Pro',
          audience: 'Enseignant en établissement',
          price: '39 $',
          period: '/mois',
          features: ['Les 5 modules', 'Tableau de bord intégré'],
          cta: 'Rejoindre la liste d’attente',
          highlight: false,
        },
        {
          name: 'Pro annuel',
          audience: 'Enseignant — accès pendant 12 mois',
          price: '250 $',
          period: 'en une fois / an',
          features: ['Toutes les fonctionnalités incluses', '12 mois d’accès', 'Un seul paiement annuel'],
          cta: 'Rejoindre la liste d’attente',
          highlight: true,
        },
        {
          name: 'Établissement',
          audience: 'Direction / Coordinateur pédagogique',
          price: '299 $',
          period: '/mois',
          features: ['Tous les enseignants de l’école', 'Analytics direction', 'Intégrations'],
          cta: 'Rejoindre la liste d’attente',
          highlight: false,
        },
        {
          name: 'District',
          audience: 'Commission scolaire / Académie',
          price: 'Sur devis',
          period: '',
          features: ['Déploiement multi-établissements', 'Conformité institutionnelle'],
          cta: 'Nous contacter',
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
        'Describe tu clase y la IA crea una lección completa, un quiz y comentarios de evaluación en menos de 60 segundos.',
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
      subtitle: 'Tres herramientas docentes impulsadas por IA',
      included: 'Incluido',
      items: [
        {
          title: 'Generación de lecciones',
          description:
            'Un formulario guiado, sin escribir prompts. La IA estructura y redacta tu lección completa, lista para exportar en PDF o Word.',
        },
        {
          title: 'Quizzes automáticos',
          description:
            'De 5 a 10 preguntas generadas después de cada lección: opción múltiple, verdadero/falso y preguntas abiertas con guía de evaluación.',
        },
        {
          title: 'Comentarios de evaluación',
          description:
            'Nombre, materia, nota y observaciones: la IA crea un comentario cercano, personalizado y pertinente.',
        },
      ],
    },
    how: {
      title: 'Cómo funciona',
      subtitle: 'Listo para usar en menos de 2 minutos',
      steps: [
        { n: '01', title: 'Crea tu perfil', detail: '90 s. Añade tu nombre, materia y nivel educativo.' },
        { n: '02', title: 'Elige el tema', detail: 'Indica título, objetivos, duración y nivel del alumnado.' },
        { n: '03', title: 'La IA genera en tiempo real', detail: 'Observa cómo aparece la lección completa mientras se crea.' },
        { n: '04', title: 'Exporta', detail: 'Descarga en PDF o Word, listo para imprimir o compartir.' },
      ],
    },
    pricing: {
      title: 'Precios sencillos',
      subtitle: 'Elige el plan que mejor se adapte a tu entorno educativo',
      popular: 'Popular',
      tiers: [
        {
          name: 'Starter',
          audience: 'Docente independiente',
          price: '20 $',
          period: '/mes',
          features: ['Módulos 1 a 4', 'Corrección y planificación'],
          cta: 'Unirme a la lista de espera',
          highlight: false,
        },
        {
          name: 'Pro',
          audience: 'Docente de un centro',
          price: '39 $',
          period: '/mes',
          features: ['Los 5 módulos', 'Panel integrado'],
          cta: 'Unirme a la lista de espera',
          highlight: false,
        },
        {
          name: 'Pro anual',
          audience: 'Docente — acceso durante 12 meses',
          price: '250 $',
          period: 'pago único / año',
          features: ['Todas las funciones incluidas', '12 meses de acceso', 'Un solo pago anual'],
          cta: 'Unirme a la lista de espera',
          highlight: true,
        },
        {
          name: 'Centro',
          audience: 'Dirección / Coordinación pedagógica',
          price: '299 $',
          period: '/mes',
          features: ['Todo el profesorado del centro', 'Análisis para dirección', 'Integraciones'],
          cta: 'Unirme a la lista de espera',
          highlight: false,
        },
        {
          name: 'Distrito',
          audience: 'Distrito escolar / Administración educativa',
          price: 'A medida',
          period: '',
          features: ['Despliegue en varios centros', 'Cumplimiento institucional'],
          cta: 'Contactar',
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
