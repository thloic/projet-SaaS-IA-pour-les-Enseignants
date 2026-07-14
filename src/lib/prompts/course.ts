import type { CourseInput } from '@/features/generation/schemas/generationSchema'
import type { ContentLanguage, GradingSystem } from '@/features/profile/types/profile.types'

interface BuildCoursePromptTeacherProfile {
  country?: string | null
  gradingSystem: GradingSystem
  language: ContentLanguage
}

function languageLabel(language: ContentLanguage) {
  return language === 'en' ? 'anglais' : 'français'
}

export function buildCoursePrompt(
  input: CourseInput,
  teacherProfile: BuildCoursePromptTeacherProfile
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = [
    'Tu es un enseignant expert de la matière et du niveau indiqués.',
    'Tu produis une séquence pédagogique complète, structurée et directement utilisable en classe.',
    'Quand le pays du profil est pertinent, tu adaptes la terminologie scolaire et les attentes au contexte local.',
    'L’alignement au programme officiel doit rester prudent : ne cite pas de référentiel précis si le contenu fourni ne le permet pas.',
    'Réponds uniquement avec le Markdown du cours, sans préambule, sans commentaire autour, sans bloc de code.',
  ].join('\n')

  const userPrompt = [
    `Langue de rédaction : ${languageLabel(teacherProfile.language)}.`,
    `Pays / province du profil : ${teacherProfile.country || 'non précisé'}.`,
    `Système de notation : ${teacherProfile.gradingSystem}.`,
    '',
    'Informations du cours :',
    `- Matière : ${input.subject}`,
    `- Niveau : ${input.level}`,
    `- Thème : ${input.topic}`,
    `- Durée totale : ${input.duration_minutes} minutes`,
    `- Objectifs demandés par l’enseignant : ${input.objectives?.trim() || 'à proposer selon le thème'}`,
    `- Types d’activités souhaités : ${input.activities?.length ? input.activities.join(', ') : 'à proposer selon le thème'}`,
    '',
    'Structure obligatoire :',
    '- Commence directement par un titre Markdown de niveau 1 : # ...',
    '- Utilise exactement ces sections, dans cet ordre, avec des titres Markdown de niveau 2 :',
    '## Objectifs pédagogiques',
    '## Prérequis',
    '## Déroulement',
    "## Exercices d'application",
    '## Évaluation',
    '## Matériel nécessaire',
    '',
    'Contraintes de contenu :',
    `- Le déroulement doit contenir une progression minutée adaptée à ${input.duration_minutes} minutes.`,
    '- Les activités doivent être concrètes, faisables en classe et cohérentes avec les types souhaités.',
    "- Les exercices d'application doivent contenir au moins 3 exercices.",
    '- La section Évaluation doit proposer un barème adapté au système de notation du profil.',
    '- Le Markdown doit être clair, scannable, et utilisable sans réécriture lourde par un professeur.',
  ].join('\n')

  return { systemPrompt, userPrompt }
}
