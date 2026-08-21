import type { StudentContext } from '../types/memory.types.ts'
import type { ResolvedDocumentTemplate } from '../types/documentTemplate.types.ts'
import type { ContentLanguage } from '@/features/i18n/locale'
import { languageLabel } from '../../i18n/locale.ts'

export function buildPATPrompt(
  studentContext: StudentContext,
  documentTemplate: ResolvedDocumentTemplate,
  language: ContentLanguage = 'fr'
): string {
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
    `Rédige tous les contenus textuels du PAT en ${languageLabel(language)}. Les noms de clés JSON restent strictement ceux du schéma.`,
    'Utilise uniquement les faits fournis ci-dessous. N’invente aucune date, preuve, recommandation factuelle ou information sur l’élève.',
    'Omet les champs facultatifs lorsqu’aucune donnée ne permet de les documenter.',
    'Formule chaque besoin comme un axe de progrès bienveillant, par exemple « Développer… », « Consolider… » ou « Renforcer… ».',
    'Les adaptations offertes doivent reprendre uniquement adaptationsInstitutionnelles, sans ajout ni substitution.',
    'Ne mentionne aucune variante de contenu pédagogique.',
    documentTemplate.kind === 'text'
      ? [
          'L’enseignant a fourni un modèle de document ci-dessous, propre à son établissement : inspire-toi de son style, de son vocabulaire et de sa structure pour rédiger le document, sans pour autant t’écarter du schéma JSON demandé ni y intégrer du texte du modèle qui ne concerne pas cet élève.',
          '',
          'MODÈLE DE DOCUMENT FOURNI PAR L’ENSEIGNANT :',
          documentTemplate.content,
        ].join('\n')
      : 'L’enseignant a fourni un modèle de document en pièce jointe (PDF), propre à son établissement : inspire-toi de son style, de son vocabulaire et de sa structure pour rédiger le document, sans pour autant t’écarter du schéma JSON demandé ni y intégrer du texte du modèle qui ne concerne pas cet élève.',
    '',
    'CONTEXTE ÉLÈVE :',
    JSON.stringify(source),
  ].join('\n')
}
