import type { AppLocale } from '@/features/i18n/locale'

export type AgentWorkspaceAction =
  | 'student'
  | 'pat'
  | 'bulletin'
  | 'results'
  | 'observation'
  | 'content'

interface WorkspaceActionCopy {
  id: AgentWorkspaceAction
  title: string
  description: string
  prompt: string
}

interface AgentWorkspaceCopy {
  eyebrow: string
  title: string
  ready: string
  newConversation: string
  navigation: string
  currentConversation: string
  classes: string
  documents: string
  welcomeTitle: string
  welcomeDescription: string
  actions: readonly WorkspaceActionCopy[]
  context: string
  automaticContext: string
  contextDescription: string
  protectedData: string
  protectedDataDescription: string
  humanValidation: string
  humanValidationDescription: string
  writingHint: string
  close: string
  language: string
  languageName: string
}

export const agentWorkspaceTranslations = {
  fr: {
    eyebrow: 'Espace pédagogique',
    title: 'Agent EducAssist',
    ready: 'Prêt à vous accompagner',
    newConversation: 'Nouvelle conversation',
    navigation: 'Navigation',
    currentConversation: 'Conversation actuelle',
    classes: 'Mes classes',
    documents: 'Documents générés',
    welcomeTitle: 'Que souhaitez-vous préparer aujourd’hui ?',
    welcomeDescription: 'Interrogez vos données de classe ou créez un document à partir des informations réellement enregistrées.',
    actions: [
      { id: 'student', title: 'Consulter un élève', description: 'Observations, résultats et progression', prompt: 'Où en est [prénom ou nom de l’élève] ?' },
      { id: 'pat', title: 'Générer un PAT', description: 'Un plan structuré prêt à relire', prompt: 'Génère le PAT de [prénom ou nom de l’élève]' },
      { id: 'bulletin', title: 'Préparer un bulletin', description: 'Un commentaire fondé sur les traces réelles', prompt: 'Prépare un commentaire de bulletin pour [prénom ou nom de l’élève], en [matière].' },
      { id: 'results', title: 'Analyser la classe', description: 'Résultats, participation et tendances', prompt: 'Analyse les résultats récents de ma classe [nom de la classe].' },
      { id: 'observation', title: 'Ajouter une observation', description: 'Enrichir le dossier d’un élève', prompt: 'Ajoute cette observation au dossier de [prénom ou nom] : [observation].' },
      { id: 'content', title: 'Créer du contenu', description: 'Cours, activité ou questionnaire', prompt: 'Aide-moi à préparer une activité pour [matière et niveau].' },
    ],
    context: 'Contexte de travail',
    automaticContext: 'Contexte automatique',
    contextDescription: 'Nommez une classe ou un élève : l’agent consultera uniquement les dossiers auxquels vous avez accès.',
    protectedData: 'Données protégées',
    protectedDataDescription: 'Les dossiers élèves restent isolés par enseignant.',
    humanValidation: 'Validation humaine',
    humanValidationDescription: 'Vous relisez et validez chaque document avant utilisation.',
    writingHint: 'Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne',
    close: 'Fermer',
    language: 'Langue',
    languageName: 'Français',
  },
  en: {
    eyebrow: 'Teaching workspace',
    title: 'EducAssist Agent',
    ready: 'Ready to assist you',
    newConversation: 'New conversation',
    navigation: 'Navigation',
    currentConversation: 'Current conversation',
    classes: 'My classes',
    documents: 'Generated documents',
    welcomeTitle: 'What would you like to prepare today?',
    welcomeDescription: 'Explore your classroom data or create a document from information that has actually been recorded.',
    actions: [
      { id: 'student', title: 'Review a student', description: 'Observations, results and progress', prompt: 'How is [student first or last name] progressing?' },
      { id: 'pat', title: 'Generate a support plan', description: 'A structured plan ready for review', prompt: 'Generate the support plan for [student first or last name]' },
      { id: 'bulletin', title: 'Prepare a report comment', description: 'A comment grounded in real evidence', prompt: 'Prepare a report comment for [student first or last name] in [subject].' },
      { id: 'results', title: 'Analyse the class', description: 'Results, participation and trends', prompt: 'Analyse the recent results for my class [class name].' },
      { id: 'observation', title: 'Add an observation', description: 'Enrich a student record', prompt: 'Add this observation to [student name]’s record: [observation].' },
      { id: 'content', title: 'Create content', description: 'Lesson, activity or questionnaire', prompt: 'Help me prepare an activity for [subject and grade].' },
    ],
    context: 'Working context',
    automaticContext: 'Automatic context',
    contextDescription: 'Name a class or student and the agent will consult only the records you are allowed to access.',
    protectedData: 'Protected data',
    protectedDataDescription: 'Student records remain isolated by teacher.',
    humanValidation: 'Human review',
    humanValidationDescription: 'You review and approve every document before using it.',
    writingHint: 'Enter to send · Shift + Enter for a new line',
    close: 'Close',
    language: 'Language',
    languageName: 'English',
  },
  es: {
    eyebrow: 'Espacio pedagógico',
    title: 'Agente EducAssist',
    ready: 'Listo para ayudarte',
    newConversation: 'Nueva conversación',
    navigation: 'Navegación',
    currentConversation: 'Conversación actual',
    classes: 'Mis clases',
    documents: 'Documentos generados',
    welcomeTitle: '¿Qué deseas preparar hoy?',
    welcomeDescription: 'Consulta los datos de tu clase o crea un documento a partir de información realmente registrada.',
    actions: [
      { id: 'student', title: 'Consultar un alumno', description: 'Observaciones, resultados y progreso', prompt: '¿Cómo progresa [nombre o apellido del alumno]?' },
      { id: 'pat', title: 'Generar un plan de apoyo', description: 'Un plan estructurado listo para revisar', prompt: 'Genera el PAT de [nombre o apellido del alumno]' },
      { id: 'bulletin', title: 'Preparar una evaluación', description: 'Un comentario basado en evidencias reales', prompt: 'Prepara un comentario de evaluación para [nombre del alumno] en [materia].' },
      { id: 'results', title: 'Analizar la clase', description: 'Resultados, participación y tendencias', prompt: 'Analiza los resultados recientes de mi clase [nombre de la clase].' },
      { id: 'observation', title: 'Añadir una observación', description: 'Enriquecer el expediente de un alumno', prompt: 'Añade esta observación al expediente de [nombre]: [observación].' },
      { id: 'content', title: 'Crear contenido', description: 'Clase, actividad o cuestionario', prompt: 'Ayúdame a preparar una actividad para [materia y nivel].' },
    ],
    context: 'Contexto de trabajo',
    automaticContext: 'Contexto automático',
    contextDescription: 'Nombra una clase o un alumno y el agente consultará únicamente los expedientes a los que tienes acceso.',
    protectedData: 'Datos protegidos',
    protectedDataDescription: 'Los expedientes permanecen aislados por docente.',
    humanValidation: 'Validación humana',
    humanValidationDescription: 'Revisas y apruebas cada documento antes de utilizarlo.',
    writingHint: 'Intro para enviar · Mayús + Intro para una nueva línea',
    close: 'Cerrar',
    language: 'Idioma',
    languageName: 'Español',
  },
} as const satisfies Record<AppLocale, AgentWorkspaceCopy>
