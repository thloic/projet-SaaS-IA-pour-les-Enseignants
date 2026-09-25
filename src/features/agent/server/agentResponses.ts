import type { AgentStructuredResponse } from '../schemas/agentSchema.ts'
import type { StudentCandidate, StudentClassContext } from '../types/memory.types.ts'
import type { AppLocale } from '@/features/i18n/locale'

// Messages partages entre les orchestrations PAT et bulletin : la resolution
// d'eleve (introuvable/ambigu) et le blocage "modele manquant" ne dependent
// pas du type de document demande, sauf pour le nom du document lui-meme.

export function buildStudentNotFoundResponse(
  studentQuery: string,
  interfaceLanguage?: AppLocale
): Extract<AgentStructuredResponse, { kind: 'student_not_found' }> {
  const message =
    interfaceLanguage === 'es'
      ? `No encuentro ningún alumno que corresponda a «${studentQuery}» en tus clases.`
      : interfaceLanguage === 'en'
        ? `I could not find a student matching “${studentQuery}” in your classes.`
        : `Je ne trouve aucun élève correspondant à « ${studentQuery} » dans vos classes.`
  return { kind: 'student_not_found', message }
}

export function buildClarificationResponse(
  candidates: StudentCandidate[],
  interfaceLanguage?: AppLocale
): Extract<AgentStructuredResponse, { kind: 'clarification' }> {
  const message =
    interfaceLanguage === 'es'
      ? 'Hay varios alumnos que corresponden a ese nombre. ¿Cuál quieres utilizar?'
      : interfaceLanguage === 'en'
        ? 'Several students match that name. Which one would you like to use?'
        : 'Plusieurs élèves correspondent à ce prénom. Lequel souhaitez-vous utiliser?'
  return {
    kind: 'clarification',
    message,
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      fullName: candidate.fullName,
      classes: candidate.classes.map((classroom) => classroom.name),
    })),
  }
}

export interface DocumentLabel {
  fr: string
  en: string
  es: string
}

export function buildTemplateMissingResponse(
  studentFullName: string,
  classes: StudentClassContext[],
  interfaceLanguage: AppLocale | undefined,
  documentLabel: DocumentLabel
): Extract<AgentStructuredResponse, { kind: 'template_missing' }> {
  const classNames = classes.map((classroom) => classroom.name).join(', ')
  const message =
    interfaceLanguage === 'es'
      ? `No hay ningún modelo de documento configurado para las clases de ${studentFullName} (${classNames}). Configura un modelo en los ajustes de la clase antes de generar ${documentLabel.es}.`
      : interfaceLanguage === 'en'
        ? `No document template is configured for ${studentFullName}’s classes (${classNames}). Configure a template in the class settings before generating ${documentLabel.en}.`
        : `Aucun modèle de document n’est configuré pour les classes de ${studentFullName} (${classNames}). Configurez un modèle dans les paramètres de la classe avant de générer ${documentLabel.fr}.`
  return { kind: 'template_missing', message }
}

export function buildStudentDataMissingResponse(
  studentFullName: string,
  documentLabel: DocumentLabel,
  interfaceLanguage?: AppLocale
): Extract<AgentStructuredResponse, { kind: 'student_data_missing' }> {
  const message =
    interfaceLanguage === 'es'
      ? `Aún no hay datos registrados para ${studentFullName}. Añade al menos un dato al expediente antes de generar ${documentLabel.es}.`
      : interfaceLanguage === 'en'
        ? `There is no saved data for ${studentFullName} yet. Add at least one item to the student record before generating ${documentLabel.en}.`
        : `Aucune donnée n’est encore enregistrée pour ${studentFullName}. Ajoutez au moins un élément au dossier avant de générer ${documentLabel.fr}.`
  return { kind: 'student_data_missing', message }
}

export function buildFollowUpPlanReviewNotReadyResponse(
  studentFullName: string,
  interfaceLanguage?: AppLocale
): Extract<AgentStructuredResponse, { kind: 'follow_up_plan_review_not_ready' }> {
  const message =
    interfaceLanguage === 'es'
      ? `Todavía quedan objetivos sin evaluar en el plan de seguimiento de ${studentFullName}. Marca el estado de cada objetivo (logrado / no logrado) antes de pedir el balance de revisión.`
      : interfaceLanguage === 'en'
        ? `Some objectives in ${studentFullName}’s follow-up plan don’t have a status yet. Mark each objective as achieved or not achieved before requesting the review summary.`
        : `Il reste des objectifs sans statut dans le plan de suivi de ${studentFullName}. Marquez chaque objectif (atteint / non atteint) avant de demander le bilan de révision.`
  return { kind: 'follow_up_plan_review_not_ready', message }
}

export function buildDocumentNotFoundForModificationResponse(
  studentFullName: string,
  documentType: 'pat' | 'bulletin',
  interfaceLanguage?: AppLocale
): Extract<AgentStructuredResponse, { kind: 'document_not_found_for_modification' }> {
  const label = documentType === 'pat'
    ? { fr: 'PAT', en: 'support plan', es: 'PAT' }
    : { fr: 'commentaire de bulletin', en: 'report card comment', es: 'comentario de boletín' }
  const message = interfaceLanguage === 'es'
    ? `No encuentro ningún ${label.es} anterior para ${studentFullName}. Genera primero uno antes de pedir una modificación.`
    : interfaceLanguage === 'en'
      ? `I cannot find a previous ${label.en} for ${studentFullName}. Generate one first before requesting a modification.`
      : `Je ne trouve aucun ${label.fr} précédent pour ${studentFullName}. Générez-en d’abord un avant de demander une modification.`
  return { kind: 'document_not_found_for_modification', message }
}
