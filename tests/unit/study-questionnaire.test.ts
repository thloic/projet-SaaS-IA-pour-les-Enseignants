import assert from 'node:assert/strict'
import test from 'node:test'

import {
  studyQuestionSchema,
  studyQuestionnaireSchema,
  studyQuestionnaireGenerationInputSchema,
} from '../../src/features/adaptation/schemas/studyQuestionnaireSchema.ts'
import {
  generateStudyQuestionnaire,
  parseStudyQuestionnaire,
} from '../../src/features/adaptation/server/studyQuestionnaireGeneration.service.ts'
import {
  formatStudyQuestionnaireText,
  studyQuestionTypeLabel,
} from '../../src/features/adaptation/utils/studyQuestionnaireText.ts'
import { buildStudyQuestionnairePrompt } from '../../src/lib/prompts/studyQuestionnaire.ts'

const vraiFaux = { type: 'vrai_faux', prompt: 'La Terre tourne autour du Soleil.', answer: 'Vrai' }
const choix = {
  type: 'choix_multiple',
  prompt: 'Quelle planète est la plus proche du Soleil ?',
  choices: ['Mars', 'Mercure', 'Vénus'],
  answer: 'Mercure',
  explanation: 'Mercure est la planète la plus proche.',
}
const courte = { type: 'reponse_courte', prompt: 'Nomme une planète rocheuse.', answer: 'Mars' }

test('règles vrai/faux : réponse limitée à Vrai ou Faux, sans choix', () => {
  assert.equal(studyQuestionSchema.safeParse(vraiFaux).success, true)
  assert.equal(studyQuestionSchema.safeParse({ ...vraiFaux, answer: 'Peut-être' }).success, false)
  assert.equal(studyQuestionSchema.safeParse({ ...vraiFaux, choices: ['Vrai', 'Faux'] }).success, false)
})

test('règles choix multiple : au moins 3 choix et réponse parmi les choix', () => {
  assert.equal(studyQuestionSchema.safeParse(choix).success, true)
  assert.equal(studyQuestionSchema.safeParse({ ...choix, answer: 'Jupiter' }).success, false)
  assert.equal(studyQuestionSchema.safeParse({ ...choix, choices: ['Mars', 'Mercure'] }).success, false)
  assert.equal(studyQuestionSchema.safeParse({ ...choix, choices: undefined }).success, false)
})

test('règles réponse courte : pas de choix', () => {
  assert.equal(studyQuestionSchema.safeParse(courte).success, true)
  assert.equal(studyQuestionSchema.safeParse({ ...courte, choices: ['Mars', 'Vénus'] }).success, false)
})

test('questionnaire : entre 3 et 30 questions', () => {
  const base = { title: 'Système solaire', questions: [vraiFaux, choix, courte] }
  assert.equal(studyQuestionnaireSchema.safeParse(base).success, true)
  assert.equal(studyQuestionnaireSchema.safeParse({ ...base, questions: [vraiFaux, choix] }).success, false)
})

test('saisie : contenu source et titre obligatoires', () => {
  const valid = {
    sourceContent: 'Un texte suffisamment long pour être transformé en questionnaire.',
    sourceTitle: 'Chapitre 3',
    subject: 'Science',
    level: '6e année',
  }
  assert.equal(studyQuestionnaireGenerationInputSchema.safeParse(valid).success, true)
  assert.equal(studyQuestionnaireGenerationInputSchema.safeParse({ ...valid, sourceContent: 'trop court' }).success, false)
})

test('parsing : accepte un JSON entouré de balises de code, rejette le JSON invalide', () => {
  const json = JSON.stringify({ title: 'Système solaire', questions: [vraiFaux, choix, courte] })
  assert.equal(parseStudyQuestionnaire('```json\n' + json + '\n```').questions.length, 3)
  assert.throws(() => parseStudyQuestionnaire('pas du json'), /JSON invalide/)
})

test('parsing : une réponse qui viole une règle de type est rejetée', () => {
  const json = JSON.stringify({
    title: 'Système solaire',
    questions: [vraiFaux, { ...choix, answer: 'Jupiter' }, courte],
  })
  assert.throws(() => parseStudyQuestionnaire(json))
})

test('mode mock : produit un questionnaire valide sans appel réseau', async () => {
  process.env.STUDY_QUESTIONNAIRE_GENERATION_MODE = 'mock'
  try {
    const questionnaire = await generateStudyQuestionnaire({
      sourceContent: 'Un texte suffisamment long pour être transformé en questionnaire.',
      sourceTitle: 'Chapitre 3',
      subject: 'Science',
      level: '6e année',
      language: 'fr',
    })
    assert.equal(studyQuestionnaireSchema.safeParse(questionnaire).success, true)
    assert.equal(questionnaire.title, 'Chapitre 3')
  } finally {
    delete process.env.STUDY_QUESTIONNAIRE_GENERATION_MODE
  }
})

test('mode fail : la génération échoue explicitement', async () => {
  process.env.STUDY_QUESTIONNAIRE_GENERATION_MODE = 'fail'
  try {
    await assert.rejects(generateStudyQuestionnaire({
      sourceContent: 'Un texte suffisamment long pour être transformé en questionnaire.',
      sourceTitle: 'Chapitre 3',
      subject: 'Science',
      level: '6e année',
      language: 'fr',
    }))
  } finally {
    delete process.env.STUDY_QUESTIONNAIRE_GENERATION_MODE
  }
})

const questionnaire = studyQuestionnaireSchema.parse({ title: 'Système solaire', questions: [vraiFaux, choix, courte] })

test('texte élèves : sans corrigé, choix lettrés A) B) C), pas de réponses', () => {
  const text = formatStudyQuestionnaireText(questionnaire, { withAnswers: false })
  assert.match(text, /^Système solaire/)
  assert.match(text, /1\. La Terre tourne autour du Soleil\./)
  assert.match(text, /   A\) Mars\n   B\) Mercure\n   C\) Vénus/)
  assert.doesNotMatch(text, /CORRIGÉ/)
})

test('texte avec corrigé : réponses et explications numérotées', () => {
  const text = formatStudyQuestionnaireText(questionnaire, { withAnswers: true })
  assert.match(text, /CORRIGÉ/)
  assert.match(text, /2\. Mercure — Mercure est la planète la plus proche\./)
})

test('libellés de type en français', () => {
  assert.equal(studyQuestionTypeLabel('vrai_faux'), 'Vrai ou faux')
  assert.equal(studyQuestionTypeLabel('choix_multiple'), 'Choix multiple')
  assert.equal(studyQuestionTypeLabel('reponse_courte'), 'Réponse courte')
})

test('prompt : langue, contraintes de types, retour d’erreur de validation', () => {
  const { systemPrompt, userPrompt } = buildStudyQuestionnairePrompt({
    sourceContent: 'Texte source de test pour le prompt.',
    sourceTitle: 'Chapitre 3',
    subject: 'Science',
    level: '6e année',
    language: 'fr',
    validationError: 'Réponse invalide : test',
  })
  assert.match(systemPrompt, /"vrai_faux"/)
  assert.match(systemPrompt, /"choix_multiple"/)
  assert.match(systemPrompt, /"reponse_courte"/)
  assert.match(userPrompt, /Réponse invalide : test/)
  assert.match(userPrompt, /TEXTE SOURCE/)
})
