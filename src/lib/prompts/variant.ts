import type {
  GeneratedVariant,
  VariantType,
} from '@/features/adaptation/schemas/adaptationSchema'

interface BuildVariantPromptInput {
  sourceContent: string
  sourceTitle: string
  subject: string
  level: string
  language: 'fr' | 'en'
  variantType: VariantType
  anonymousNeeds: string[]
  validationError?: string
}

const VARIANT_RULES: Record<VariantType, string> = {
  standard: `
- Optimise la clarté et l'organisation sans réduire l'exigence pédagogique.
- Conserve toutes les notions, consignes et activités essentielles de la source.
- Utilise un vocabulaire adapté au niveau indiqué.`,
  support: `
- Simplifie le vocabulaire sans appauvrir la notion enseignée.
- Décompose chaque consigne en étapes courtes, explicites et numérotées.
- Ajoute des exemples guidés, des rappels et des indices progressifs.
- Réduit la charge de lecture lorsque cela ne change pas l'objectif pédagogique.`,
  dys: `
- Utilise des phrases courtes, une idée par phrase et des consignes très explicites.
- Évite les doubles négations, les blocs denses et les formulations ambiguës.
- Propose des repères visuels textuels et des pictogrammes sous la forme "[Pictogramme : description]".
- Signale dans accommodations les règles de présentation utiles : police lisible, taille 14 minimum, interligne 1,5 et alignement à gauche.
- Ne prétends jamais qu'une police ou une mise en page est déjà appliquée dans le JSON.`,
  adhd: `
- Découpe le travail en micro-étapes courtes avec un résultat visible à chaque étape.
- Place une seule consigne principale par section.
- Ajoute des repères de progression, des pauses actives et des durées indicatives.
- Mets en évidence l'essentiel et limite les informations concurrentes.`,
  enrichment: `
- Conserve les objectifs de base puis ajoute de la profondeur et de l'autonomie.
- Propose des questions ouvertes, des défis, des connexions interdisciplinaires et une recherche complémentaire.
- Évite simplement d'ajouter plus d'exercices répétitifs : augmente surtout la complexité du raisonnement.`,
}

export function buildVariantPrompt(input: BuildVariantPromptInput): {
  systemPrompt: string
  userPrompt: string
} {
  const outputLanguage = input.language === 'en' ? 'anglais' : 'français'
  const needs =
    input.anonymousNeeds.length > 0
      ? input.anonymousNeeds.join(', ')
      : 'aucun besoin élève ciblé'

  const systemPrompt = `Tu es un enseignant spécialiste de la différenciation pédagogique et de l'éducation inclusive.
Tu adaptes une leçon existante sans modifier ses faits, ses objectifs fondamentaux ni introduire de connaissances non vérifiées.

Règles absolues :
- Rédige entièrement en ${outputLanguage}.
- Ne mentionne aucun élève, diagnostic individuel ou donnée personnelle.
- Ne présente jamais une adaptation comme un traitement médical.
- Conserve la matière (${input.subject}) et le niveau (${input.level}).
- Produis uniquement un objet JSON valide, sans markdown, sans commentaire et sans backticks.

Le JSON doit respecter exactement cette structure :
{
  "title": "titre adapté",
  "summary": "résumé de l'approche retenue",
  "learningObjectives": ["objectif"],
  "sections": [
    {
      "heading": "titre de section",
      "content": "contenu pédagogique",
      "instructions": ["consigne courte"]
    }
  ],
  "exercises": [
    {
      "instruction": "exercice",
      "supportHint": "indice ou null"
    }
  ],
  "accommodations": ["aménagement concret"],
  "teacherNotes": ["note pour l'enseignant"],
  "visualSupports": ["support visuel à prévoir"]
}`

  const retryInstruction = input.validationError
    ? `\nLa réponse précédente était invalide : ${input.validationError}. Corrige strictement la structure JSON.`
    : ''

  const userPrompt = `Crée la variante "${input.variantType}" de cette leçon.

Règles spécifiques :
${VARIANT_RULES[input.variantType]}

Synthèse anonyme du groupe ciblé : ${needs}.
Cette synthèse sert uniquement à calibrer le niveau d'étayage. Elle ne doit pas apparaître dans la réponse.

Titre source : ${input.sourceTitle}
Matière : ${input.subject}
Niveau : ${input.level}

CONTENU SOURCE
${input.sourceContent}
FIN DU CONTENU SOURCE
${retryInstruction}`

  return { systemPrompt, userPrompt }
}

export function variantToMarkdown(variant: GeneratedVariant): string {
  const lines = [
    `# ${variant.title}`,
    '',
    variant.summary,
    '',
    '## Objectifs pédagogiques',
    ...variant.learningObjectives.map((objective) => `- ${objective}`),
  ]

  for (const section of variant.sections) {
    lines.push('', `## ${section.heading}`, '', section.content)
    if (section.instructions.length > 0) {
      lines.push('', ...section.instructions.map((instruction, index) => `${index + 1}. ${instruction}`))
    }
  }

  if (variant.exercises.length > 0) {
    lines.push('', "## Exercices d'application")
    for (const [index, exercise] of variant.exercises.entries()) {
      lines.push('', `${index + 1}. ${exercise.instruction}`)
      if (exercise.supportHint) lines.push(`   - Indice : ${exercise.supportHint}`)
    }
  }

  lines.push(
    '',
    '## Aménagements',
    ...variant.accommodations.map((item) => `- ${item}`)
  )

  if (variant.visualSupports.length > 0) {
    lines.push(
      '',
      '## Supports visuels',
      ...variant.visualSupports.map((item) => `- ${item}`)
    )
  }

  if (variant.teacherNotes.length > 0) {
    lines.push(
      '',
      '## Notes pour l’enseignant',
      ...variant.teacherNotes.map((item) => `- ${item}`)
    )
  }

  return lines.join('\n').trim()
}
