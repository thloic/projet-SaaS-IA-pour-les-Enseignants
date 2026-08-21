import type { BulletinGenerationInput } from '@/features/bulletin/schemas/bulletinSchema'
import type { GradingSystem, ContentLanguage } from '@/features/profile/types/profile.types'
import type { ResolvedDocumentTemplate } from '@/features/agent/types/documentTemplate.types'
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
}: BuildBulletinPromptInput): { systemPrompt: string; userPrompt: string } {
  const teacherSubjects = teacherProfile.subjects?.length
    ? teacherProfile.subjects.join(', ')
    : teacherProfile.subject
      ? teacherProfile.subject
      : 'matière non précisée'

  const systemPrompt = [
    'Tu es un enseignant expérimenté qui rédige des commentaires de bulletin destinés à une famille.',
    'Tu écris un commentaire professionnel, utile et directement exploitable par un professeur.',
    'Règle absolue : aucune formulation négative directe. Les difficultés doivent toujours être reformulées en axes de progrès.',
    'Exemple obligatoire à suivre : PAS "élève en difficulté à l’écrit" MAIS "l’expression écrite constitue son prochain axe de progression".',
    'La sortie doit être uniquement un objet JSON strict au format { "comment": "..." }, sans markdown, sans backticks, sans texte autour.',
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
    '',
    'Contraintes de rédaction :',
    '- 3 à 6 lignes.',
    '- Un seul paragraphe.',
    '- Mentionner les éléments observables fournis sans inventer de faits précis.',
    '- Formuler les axes d’amélioration de manière constructive.',
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
    '{ "comment": "..." }',
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
