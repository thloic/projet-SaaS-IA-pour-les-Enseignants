import assert from 'node:assert/strict'
import test from 'node:test'

import { appTranslations } from '../../src/features/i18n/appTranslations.ts'
import {
  APP_LOCALES,
  intlLocale,
  languageLabel,
  normalizeAppLocale,
} from '../../src/features/i18n/locale.ts'
import { profileSchema } from '../../src/features/profile/schemas/profileSchema.ts'
import { buildAgentSystemPrompt } from '../../src/lib/prompts/agent.ts'
import { buildBulletinPrompt } from '../../src/lib/prompts/bulletin.ts'
import { buildCorrectionPrompt } from '../../src/lib/prompts/correction.ts'
import { buildCoursePrompt } from '../../src/lib/prompts/course.ts'
import { buildVariantPrompt } from '../../src/lib/prompts/variant.ts'
import { buildQuizPrompt } from '../../src/lib/prompts/quiz.ts'
import { quizQuestionSchema } from '../../src/features/quiz/schemas/quizSchema.ts'

function translationShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(translationShape)
  if (typeof value !== 'object' || value === null) return typeof value
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, translationShape(child)])
  )
}

test('le contrat de langue accepte uniquement français, anglais et espagnol', () => {
  assert.deepEqual(APP_LOCALES, ['en', 'fr', 'es'])
  assert.equal(normalizeAppLocale('es'), 'es')
  assert.equal(normalizeAppLocale('de'), 'en')
  assert.equal(normalizeAppLocale(null, 'fr'), 'fr')
  assert.equal(languageLabel('es'), 'espagnol international')
  assert.equal(intlLocale('es'), 'es-ES')
})

test('les catalogues FR, EN et ES possèdent exactement la même structure', () => {
  const englishShape = translationShape(appTranslations.en)
  assert.deepEqual(translationShape(appTranslations.fr), englishShape)
  assert.deepEqual(translationShape(appTranslations.es), englishShape)
})

test('le profil sépare la langue de l’interface de celle des contenus', () => {
  const base = {
    firstName: 'Lucía',
    lastName: 'Torres',
    country: 'España',
    subjects: ['Matemáticas'],
    levels: ['Secundaria'],
    gradingSystem: '10',
    styleNotes: '',
  }

  assert.equal(profileSchema.safeParse({ ...base, language: 'fr', interfaceLanguage: 'es' }).success, true)
  assert.equal(profileSchema.safeParse({ ...base, language: 'es', interfaceLanguage: 'en' }).success, true)
  assert.equal(profileSchema.safeParse({ ...base, language: 'de', interfaceLanguage: 'es' }).success, false)
})

test('tous les générateurs principaux demandent explicitement une sortie espagnole', () => {
  const course = buildCoursePrompt(
    { subject: 'Matemáticas', level: 'Secundaria', topic: 'Fracciones', duration_minutes: 45 },
    { gradingSystem: '10', language: 'es', country: 'España' }
  )
  const bulletin = buildBulletinPrompt({
    input: { student_name: 'Alumno ficticio', subject: 'Lengua', grade: '8/10', tone: 'encourageant' },
    teacherProfile: { gradingSystem: '10', language: 'es' },
  })
  const correction = buildCorrectionPrompt({
    contentText: 'Texto ficticio suficientemente largo.',
    tone: 'factuel',
    teacherProfile: { language: 'es' },
  })
  const variant = buildVariantPrompt({
    sourceContent: 'Contenido pedagógico ficticio suficientemente detallado.',
    sourceTitle: 'Fracciones',
    subject: 'Matemáticas',
    level: 'Secundaria',
    language: 'es',
    variantType: 'support',
    anonymousNeeds: [],
  })
  const agent = buildAgentSystemPrompt({ language: 'es', country: 'España' })
  const quiz = buildQuizPrompt({
    content: 'Contenido ficticio sobre las fracciones.',
    gradingSystem: '10',
    questionCount: 5,
    language: 'es',
  })

  for (const prompt of [course.userPrompt, bulletin.userPrompt, correction.userPrompt, variant.systemPrompt, agent, quiz]) {
    assert.match(prompt, /espagnol international/i)
  }
  assert.match(quiz, /Verdadero.*Falso/i)
})

test('le schéma du quiz accepte les réponses vrai/faux localisées en espagnol', () => {
  assert.equal(quizQuestionSchema.safeParse({
    id: 'q1',
    type: 'true_false',
    prompt: 'La suma de dos fracciones puede requerir un denominador común.',
    options: ['Verdadero', 'Falso'],
    correctAnswer: 'Verdadero',
    correctionGuide: null,
    points: 1,
  }).success, true)
})
