import type { StudentContext } from '../types/memory.types.ts'

export function buildPATPrompt(studentContext: StudentContext): string {
  const source = {
    eleve: {
      nom: studentContext.student.fullName,
      langueFamiliale: studentContext.student.familyLanguage,
      besoins: studentContext.student.needs,
      adaptationsInstitutionnelles: studentContext.student.institutionalAdaptations,
      planInterventionExistant: studentContext.student.interventionPlan,
      notesGenerales: studentContext.student.generalNotes || undefined,
    },
    classes: studentContext.classes.map(({ name, level, subject }) => ({
      name,
      level,
      subject,
    })),
    observationsRecentes: studentContext.observations.map(
      ({ category, tag, note, createdAt }) => ({ category, tag, note, createdAt })
    ),
    participationsRecentes: studentContext.participations.map(
      ({ value, label, createdAt }) => ({ value, label, createdAt })
    ),
    presencesRecentes: studentContext.attendance.map(
      ({ status, note, updatedAt }) => ({ status, note, updatedAt })
    ),
  }

  return [
    'Génère un plan d’appui temporaire conforme au schéma JSON demandé.',
    'Utilise uniquement les faits fournis ci-dessous. N’invente aucune date, preuve, recommandation factuelle ou information sur l’élève.',
    'Omet les champs facultatifs lorsqu’aucune donnée ne permet de les documenter.',
    'Formule chaque besoin comme un axe de progrès bienveillant, par exemple « Développer… », « Consolider… » ou « Renforcer… ».',
    'Les adaptations offertes doivent reprendre uniquement adaptationsInstitutionnelles, sans ajout ni substitution.',
    'Ne mentionne aucune variante de contenu pédagogique.',
    '',
    'CONTEXTE ÉLÈVE :',
    JSON.stringify(source),
  ].join('\n')
}
