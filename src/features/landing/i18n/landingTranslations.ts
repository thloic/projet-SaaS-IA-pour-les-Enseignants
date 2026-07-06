export type LandingLocale = 'en' | 'fr'

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
} as const
