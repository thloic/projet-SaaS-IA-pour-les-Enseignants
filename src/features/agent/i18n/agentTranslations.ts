import type { AppLocale } from '@/features/i18n/locale'

export const agentTranslations = {
  fr: {
    title: 'Agent EducAssist',
    subtitle: 'Votre assistant pédagogique conversationnel',
    empty: 'Décrivez ce dont vous avez besoin, ou utilisez une action rapide ci-dessus.',
    placeholder: 'Écrivez votre message…',
    responseFailed: 'La réponse de l’agent a échoué.',
    invalidStructured: 'La réponse structurée de l’agent est invalide.',
    emptyResponse: 'La réponse de l’agent est vide.',
    patPrompt: (name: string) => `Génère le PAT de ${name}`,
    quick: [
      ['Générer un plan d’appui', 'Génère le PAT de [prénom ou nom de l’élève]'],
      ['Rédiger un commentaire de bulletin', 'Je veux rédiger un commentaire de bulletin. Élève : [prénom], matière : [matière], note ou appréciation : [note], observations : [observations]'],
      ['Préparer un suivi d’élève', 'Je veux préparer un suivi d’élève. Adaptations en place : [adaptations], observations récentes : [observations], prochaines étapes envisagées : [étapes]'],
    ],
  },
  en: {
    title: 'EducAssist Agent',
    subtitle: 'Your conversational teaching assistant',
    empty: 'Describe what you need, or use a quick action above.',
    placeholder: 'Write your message…',
    responseFailed: 'The agent response failed.',
    invalidStructured: 'The structured agent response is invalid.',
    emptyResponse: 'The agent response is empty.',
    patPrompt: (name: string) => `Generate the support plan for ${name}`,
    quick: [
      ['Generate a support plan', 'Generate the support plan for [student first or last name]'],
      ['Write a report comment', 'I want to write a report comment. Student: [name], subject: [subject], grade: [grade], observations: [observations]'],
      ['Prepare a student follow-up', 'I want to prepare a student follow-up. Existing accommodations: [accommodations], recent observations: [observations], next steps: [steps]'],
    ],
  },
  es: {
    title: 'Agente EducAssist',
    subtitle: 'Tu asistente pedagógico conversacional',
    empty: 'Describe lo que necesitas o utiliza una acción rápida.',
    placeholder: 'Escribe tu mensaje…',
    responseFailed: 'La respuesta del agente ha fallado.',
    invalidStructured: 'La respuesta estructurada del agente no es válida.',
    emptyResponse: 'La respuesta del agente está vacía.',
    patPrompt: (name: string) => `Genera el PAT de ${name}`,
    quick: [
      ['Generar un plan de apoyo', 'Genera el PAT de [nombre o apellido del alumno]'],
      ['Redactar un comentario de evaluación', 'Quiero redactar un comentario de evaluación. Alumno: [nombre], materia: [materia], nota: [nota], observaciones: [observaciones]'],
      ['Preparar un seguimiento', 'Quiero preparar el seguimiento de un alumno. Adaptaciones existentes: [adaptaciones], observaciones recientes: [observaciones], próximos pasos: [pasos]'],
    ],
  },
} as const satisfies Record<AppLocale, object>
