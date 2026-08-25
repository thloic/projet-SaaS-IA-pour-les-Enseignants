import type { BulletinGenerationInput } from '@/features/bulletin/schemas/bulletinSchema'
import type { GradingSystem, ContentLanguage } from '@/features/profile/types/profile.types'
import type { ResolvedDocumentTemplate } from '@/features/agent/types/documentTemplate.types'
import type { StudentEvaluationResultContext, StudentObservationContext } from '@/features/agent/types/memory.types'
import { languageLabel } from '../../features/i18n/locale.ts'

interface BuildBulletinPromptInput {
  input: BulletinGenerationInput
  teacherProfile: {
    subject?: string | null
    subjects?: string[] | null
    gradingSystem: GradingSystem
    language: ContentLanguage
  }
  validationError?: string
  documentTemplate?: ResolvedDocumentTemplate
  evaluationResults?: StudentEvaluationResultContext[]
  studentObservations?: StudentObservationContext[]
  previousComment?: string
  modificationInstruction?: string
}

const toneInstructions: Record<BulletinGenerationInput['tone'], string> = {
  bienveillant:
    'Ton bienveillant : chaleureux, humain, attentif à la personne, valorise les qualités et les efforts sans exagération.',
  encourageant:
    'Ton encourageant : dynamique, motivant, orienté vers les progrès à venir et les prochaines réussites possibles.',
  factuel:
    'Ton factuel : sobre, précis, centré sur les résultats observables, sans lyrisme ni formulation émotionnelle excessive.',
}

export function buildBulletinPrompt({
  input,
  teacherProfile,
  validationError,
  documentTemplate,
  evaluationResults = [],
  studentObservations = [],
  previousComment,
  modificationInstruction,
}: BuildBulletinPromptInput): { systemPrompt: string; userPrompt: string } {
  const teacherSubjects = teacherProfile.subjects?.length
    ? teacherProfile.subjects.join(', ')
    : teacherProfile.subject
      ? teacherProfile.subject
      : 'matière non précisée'

  const resultLines = evaluationResults.map((result) =>
    `- ${result.createdAt.slice(0, 10)} · ${result.title || 'Évaluation'} : ${result.grade}`
  )
  const observationLines = studentObservations.map((observation) =>
    `- ${observation.createdAt.slice(0, 10)} · ${observation.tag}${observation.note ? ` : ${observation.note}` : ''}`
  )

  const systemPrompt = [
    'Tu es un enseignant expérimenté qui rédige des commentaires de bulletin scolaire officiel destinés à une famille.',
    'Un commentaire de bulletin suit toujours la même structure, utilisée par les écoles : deux points forts distincts observés chez l’élève, puis une prochaine étape (jamais un point faible formulé négativement — une seule direction de progrès, jamais deux).',
    'Règle absolue : aucune formulation négative directe, nulle part. Les difficultés se reformulent toujours en axe de progrès pour la prochaine étape.',
    'Exemple obligatoire à suivre : PAS "élève en difficulté à l’écrit" MAIS "l’expression écrite constitue son prochain axe de progression".',
    'La sortie doit être uniquement un objet JSON strict au format { "strengths": ["...", "..."], "nextStep": "..." }, sans markdown, sans backticks, sans texte autour. "strengths" contient exactement deux phrases complètes et distinctes. "nextStep" contient une seule phrase complète.',
  ].join('\n')

  const userPrompt = [
    `Langue de rédaction : ${languageLabel(teacherProfile.language)}.`,
    `Matière du profil enseignant : ${teacherSubjects}.`,
    `Système de notation du profil : ${teacherProfile.gradingSystem}.`,
    '',
    'Contexte du commentaire :',
    `- Élève : ${input.student_name}`,
    `- Matière : ${input.subject}`,
    `- Note ou appréciation : ${input.grade}`,
    `- Observations du professeur : ${input.observations?.trim() || 'Aucune observation complémentaire.'}`,
    previousComment && modificationInstruction
      ? [
          '',
          'COMMENTAIRE PRÉCÉDENT :',
          previousComment,
          '',
          'INSTRUCTION DE MODIFICATION :',
          modificationInstruction,
          'Applique uniquement cette modification, conserve le reste du commentaire et renvoie toujours la structure JSON obligatoire.',
        ].join('\n')
      : '',
    '',
    'Résultats enregistrés dans le carnet pour cette classe :',
    ...(resultLines.length > 0 ? resultLines : ['- Aucun résultat enregistré.']),
    '',
    'Observations récentes enregistrées dans le dossier élève :',
    ...(observationLines.length > 0 ? observationLines : ['- Aucune observation enregistrée.']),
    '',
    'Structure obligatoire du commentaire, en 3 phrases complètes et distinctes :',
    '1. Un premier point fort observé chez l’élève dans cette matière.',
    '2. Un second point fort, différent du premier.',
    '3. Une prochaine étape : ce que l’élève devrait travailler ensuite pour progresser, jamais formulée comme un point faible.',
    '- Appuie les deux points forts et la prochaine étape sur les résultats et observations enregistrés ci-dessus.',
    '- Mentionne uniquement les éléments observables fournis ci-dessus, sans inventer de faits précis.',
    `- ${toneInstructions[input.tone]}`,
    '',
    documentTemplate?.kind === 'text'
      ? [
          '',
          'L’enseignant a fourni un modèle de document ci-dessous, propre à son établissement : inspire-toi de son style et de son vocabulaire pour rédiger le commentaire, sans t’écarter du format JSON demandé.',
          '',
          'MODÈLE DE DOCUMENT FOURNI PAR L’ENSEIGNANT :',
          documentTemplate.content,
        ].join('\n')
      : documentTemplate?.kind === 'pdf'
        ? 'L’enseignant a fourni un modèle de document en pièce jointe (PDF), propre à son établissement : inspire-toi de son style et de son vocabulaire pour rédiger le commentaire, sans t’écarter du format JSON demandé.'
        : '',
    '',
    'Sortie attendue :',
    '{ "strengths": ["...", "..."], "nextStep": "..." }',
    validationError
      ? [
          '',
          'La réponse précédente était invalide pour cette raison :',
          validationError,
          'Corrige la sortie en respectant strictement le JSON attendu.',
        ].join('\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  return { systemPrompt, userPrompt }
}
