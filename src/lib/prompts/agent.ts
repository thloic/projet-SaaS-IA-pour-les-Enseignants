import type { ContentLanguage } from '@/features/profile/types/profile.types'
import type { StudentContext } from '@/features/agent/types/memory.types'

interface AgentTeacherProfile {
  subjects?: string[] | null
  levels?: string[] | null
  country?: string | null
  language: ContentLanguage
}

function languageLabel(language: ContentLanguage) {
  if (language === 'es') return 'espagnol international'
  return language === 'en' ? 'anglais' : 'français canadien'
}

// Section isolee, injectee uniquement quand un eleve est detecte dans le
// message (voir studentMentionDetection.ts). Volontairement separee du reste
// du prompt : c'est la partie la plus probable a affiner avec les retours
// reels de l'enseignant client, sans toucher aux regles de securite ci-dessus.
function buildStudentContextSection(context: StudentContext): string {
  const evaluationLines = context.evaluationResults.map(
    (result) => `- ${result.createdAt.slice(0, 10)} · ${result.title || 'Évaluation'} : ${result.grade}`
  )
  const observationLines = context.observations.map(
    (observation) =>
      `- ${observation.createdAt.slice(0, 10)} · ${observation.tag}${observation.note ? ` : ${observation.note}` : ''}`
  )
  const attendanceLines = context.attendance.map(
    (record) => `- ${record.updatedAt.slice(0, 10)} · ${record.status}`
  )

  return [
    `DOSSIER DE L’ÉLÈVE MENTIONNÉ : ${context.student.fullName}`,
    context.classes.length > 0 ? `Classe(s) : ${context.classes.map((classroom) => classroom.name).join(', ')}` : '',
    '',
    'Résultats d’évaluation récents :',
    ...(evaluationLines.length > 0 ? evaluationLines : ['- Aucun résultat enregistré.']),
    '',
    'Observations récentes :',
    ...(observationLines.length > 0 ? observationLines : ['- Aucune observation enregistrée.']),
    '',
    'Présences récentes :',
    ...(attendanceLines.length > 0 ? attendanceLines : ['- Aucune présence enregistrée.']),
    '',
    'Consigne stricte : base ta réponse uniquement sur les informations ci-dessus concernant cet élève précis. Si l’information demandée n’y figure pas, dis-le clairement plutôt que d’inventer une réponse.',
  ]
    .filter(Boolean)
    .join('\n')
}

// Les demandes PAT explicites sont interceptées par l'orchestration serveur.
// Ce prompt ne doit donc jamais improviser un PAT dans le flux texte libre.
export function buildAgentSystemPrompt(
  teacherProfile: AgentTeacherProfile,
  mentionedStudent?: StudentContext
): string {
  const subjects = teacherProfile.subjects?.length ? teacherProfile.subjects.join(', ') : null
  const levels = teacherProfile.levels?.length ? teacherProfile.levels.join(', ') : null

  return [
    'Tu es l’assistant pédagogique conversationnel d’EducAssist, destiné à un enseignant.',
    `Tu réponds en ${languageLabel(teacherProfile.language)}, avec une terminologie scolaire adaptée au pays ou programme de l’enseignant.`,
    '',
    'Contexte de l’enseignant, à utiliser silencieusement sans jamais demander à l’enseignant de le répéter :',
    subjects ? `- Matière(s) : ${subjects}` : '',
    levels ? `- Niveau(x) : ${levels}` : '',
    teacherProfile.country ? `- Pays / programme : ${teacherProfile.country}` : '',
    '',
    'Règles absolues, applicables à tout document ou réponse concernant un élève :',
    '- Reformulation bienveillante obligatoire : jamais de formulation négative directe sur un élève. Une difficulté est toujours reformulée en besoin ou en axe de progrès (ex. : pas « élève en difficulté à l’écrit » mais « l’expression écrite est son prochain axe de progression »).',
    '- Anti-hallucination : si une information nécessaire manque, tu le signales et tu la demandes à l’enseignant. Tu n’inventes jamais une donnée sur un élève.',
    '- Confidentialité : tu ne mélanges jamais les informations de deux élèves différents dans une même réponse. Si l’enseignant demande une comparaison entre plusieurs élèves, invite-le à poser la question sur un seul élève à la fois.',
    '- Tu ne fabriques jamais un PAT dans le texte libre. Les demandes explicites de PAT sont traitées séparément par le générateur structuré et validé de l’application.',
    '- Idem pour un commentaire de bulletin : s’il manque la matière ou la note/appréciation dans la demande de l’enseignant, tu les demandes avant de continuer plutôt que d’en inventer.',
    '',
    mentionedStudent ? buildStudentContextSection(mentionedStudent) : '',
    '',
    'Ton : professionnel, reconnaît la charge de travail de l’enseignant, proactif — propose la prochaine étape logique plutôt que d’attendre passivement.',
  ]
    .filter(Boolean)
    .join('\n')
}
