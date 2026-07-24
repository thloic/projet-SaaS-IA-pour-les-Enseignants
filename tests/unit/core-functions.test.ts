import assert from 'node:assert/strict'
import test from 'node:test'

import { getAuthCallbackErrorMessage, getAuthErrorMessage } from '../../src/features/auth/utils/authError.ts'
import { magicLinkSchema } from '../../src/features/auth/schemas/authSchema.ts'
import { classSchema, observationSchema, studentSchema } from '../../src/features/classroom/schemas/classroomSchema.ts'
import { contactSchema } from '../../src/features/contact/schemas/contactSchema.ts'
import { documentSchema } from '../../src/features/documents/schemas/documentSchema.ts'
import {
  adaptationGenerationInputSchema,
  generatedVariantSchema,
} from '../../src/features/adaptation/schemas/adaptationSchema.ts'
import {
  resolveStudentVariant,
  summarizeAnonymousNeeds,
} from '../../src/features/adaptation/utils/resolveStudentNeeds.ts'
import { buildDocx } from '../../src/features/export/utils/buildDocx.ts'
import { buildPdf } from '../../src/features/export/utils/buildPdf.ts'
import { profileSchema } from '../../src/features/profile/schemas/profileSchema.ts'
import {
  getProfileSaveErrorMessage,
  isMissingSubjectsColumnError,
  normalizeProfileSaveError,
  withoutSubjectsColumn,
} from '../../src/features/profile/utils/profileSaveError.ts'
import { normalizeGradingSystem } from '../../src/features/profile/types/profile.types.ts'
import { buildBulletinPrompt } from '../../src/lib/prompts/bulletin.ts'
import { buildCoursePrompt } from '../../src/lib/prompts/course.ts'
import { buildQuizPrompt } from '../../src/lib/prompts/quiz.ts'
import { buildVariantPrompt } from '../../src/lib/prompts/variant.ts'
import { createLiteLLMClient } from '../../src/lib/llm/litellm.ts'
import { cn } from '../../src/lib/utils.ts'

test('magicLinkSchema accepts valid email and rejects invalid email', () => {
  assert.equal(magicLinkSchema.safeParse({ email: 'teacher@example.com' }).success, true)
  assert.equal(magicLinkSchema.safeParse({ email: 'not-an-email' }).success, false)
})

test('getAuthErrorMessage maps infrastructure, email, and OAuth errors', () => {
  assert.match(
    getAuthErrorMessage({ message: 'Database error saving new user' }),
    /configuration/
  )
  assert.match(getAuthErrorMessage({ code: 'over_email_send_rate_limit' }), /lien de connexion/)
  assert.match(getAuthErrorMessage({ name: 'OAuthGoogleError' }), /Google/)
  assert.match(getAuthErrorMessage(null), /connexion a échoué|connexion a echoue/i)
})

test('getAuthCallbackErrorMessage reads search and hash callback failures', () => {
  assert.equal(getAuthCallbackErrorMessage('', ''), null)
  const searchError = getAuthCallbackErrorMessage('?error=auth&error_description=otp_failed', '')
  const hashError = getAuthCallbackErrorMessage('', '#error=server_error&error_code=unexpected_failure')

  if (!searchError || !hashError) {
    throw new Error('Expected callback errors to be translated')
  }

  assert.match(searchError, /lien de connexion/)
  assert.match(hashError, /configuration/)
})

test('profileSchema validates the complete onboarding payload', () => {
  const result = profileSchema.safeParse({
    firstName: 'Marie',
    lastName: 'Dupont',
    country: 'Canada - Quebec',
    subjects: ['Francais'],
    levels: ['Secondaire 1er cycle'],
    gradingSystem: '20',
    language: 'fr',
    styleNotes: 'Ton bienveillant',
  })

  assert.equal(result.success, true)
  assert.equal(profileSchema.safeParse({ firstName: '', subjects: [], levels: [] }).success, false)
})

test('normalizeGradingSystem defaults unknown values to 20', () => {
  assert.equal(normalizeGradingSystem('10'), '10')
  assert.equal(normalizeGradingSystem('letter'), 'letter')
  assert.equal(normalizeGradingSystem('invalid'), '20')
  assert.equal(normalizeGradingSystem(null), '20')
})

test('profile save error utilities expose Supabase schema drift clearly', () => {
  const missingColumnError = {
    code: '42703',
    message: 'column teacher_profiles.subjects does not exist',
    hint: 'Perhaps you meant subject.',
  }

  assert.equal(isMissingSubjectsColumnError(missingColumnError), true)
  assert.match(getProfileSaveErrorMessage(missingColumnError), /migration des matières multiples/)
  assert.deepEqual(normalizeProfileSaveError(missingColumnError), {
    ...missingColumnError,
    details: undefined,
  })
  assert.deepEqual(withoutSubjectsColumn({ subject: 'Maths', subjects: ['Maths'] }), { subject: 'Maths' })
})

test('classroom schemas validate classes, students, and observations', () => {
  assert.equal(classSchema.safeParse({ name: 'Groupe 201', level: 'Secondaire 2', subject: 'Maths' }).success, true)
  assert.equal(classSchema.safeParse({ name: 'A', level: '', subject: '' }).success, false)

  assert.equal(
    studentSchema.safeParse({
      firstName: 'Awa',
      lastName: 'Mensah',
      sex: 'F',
      familyLanguage: 'Francais',
      interventionPlan: true,
    }).success,
    true
  )
  assert.equal(studentSchema.safeParse({ firstName: 'Awa', lastName: 'Mensah', sex: 'X' }).success, false)

  assert.equal(observationSchema.safeParse({ category: 'progress', tag: 'Participation' }).success, true)
  assert.equal(observationSchema.safeParse({ category: 'invalid', tag: '' }).success, false)
})

test('documentSchema validates manual and file source documents', () => {
  assert.equal(
    documentSchema.safeParse({
      title: 'Fractions',
      contentText: 'Additionner deux fractions.',
      sourceType: 'text',
    }).success,
    true
  )
  assert.equal(
    documentSchema.safeParse({
      title: 'PDF',
      contentText: 'Contenu extrait',
      sourceType: 'file',
      originalFilename: 'cours.pdf',
      fileType: 'pdf',
    }).success,
    true
  )
  assert.equal(documentSchema.safeParse({ title: '', contentText: '', sourceType: 'scan' }).success, false)
})

test('contactSchema validates a complete contact request', () => {
  assert.equal(
    contactSchema.safeParse({
      name: 'Marie Dupont',
      email: 'marie@example.com',
      subject: 'Demande demo',
      phone: '+15145550101',
    }).success,
    true
  )
  assert.equal(contactSchema.safeParse({ name: 'M', email: 'bad', subject: 'x', phone: '1' }).success, false)
})

test('cn merges conditional and conflicting Tailwind classes', () => {
  assert.equal(cn('px-2', false && 'hidden', 'px-4', 'text-sm'), 'px-4 text-sm')
})

test('createLiteLLMClient reads environment configuration', () => {
  process.env.LITELLM_BASE_URL = 'https://litellm.example.test'
  process.env.LITELLM_API_KEY = 'test-key'

  assert.deepEqual(createLiteLLMClient(), {
    baseUrl: 'https://litellm.example.test',
    apiKey: 'test-key',
  })
})

test('prompt builders expose structured generation instructions', () => {
  const coursePrompt = buildCoursePrompt(
    {
      subject: 'Mathématiques',
      level: 'Secondaire',
      topic: 'Fractions',
      duration_minutes: 60,
      activities: ['Exercices'],
    },
    { country: 'Canada - Québec', gradingSystem: 'percentage', language: 'fr' }
  )
  assert.match(coursePrompt.userPrompt, /Objectifs pédagogiques/)

  const quizPrompt = buildQuizPrompt({
    content: 'Cours sur les fractions',
    gradingSystem: 'percentage',
    questionCount: 5,
    subject: 'Mathématiques',
    level: 'Secondaire',
  })
  assert.match(quizPrompt, /objet JSON valide/)
  assert.match(quizPrompt, /percentage/)

  const bulletinPrompt = buildBulletinPrompt({
    input: {
      student_name: 'Awa',
      subject: 'Français',
      grade: '14/20',
      tone: 'encourageant',
    },
    teacherProfile: {
      subject: 'Français',
      gradingSystem: '20',
      language: 'fr',
    },
  })
  assert.match(bulletinPrompt.systemPrompt, /JSON strict/)

  const variantPrompt = buildVariantPrompt({
    sourceContent: 'Cours complet sur les fractions et exercices associés.',
    sourceTitle: 'Les fractions',
    subject: 'Mathématiques',
    level: 'Secondaire',
    language: 'fr',
    variantType: 'dys',
    anonymousNeeds: ['dys: 2'],
  })
  assert.match(variantPrompt.userPrompt, /police lisible/i)
  assert.match(variantPrompt.systemPrompt, /objet JSON valide/)
})

test('adaptation schemas and anonymous student mapping are deterministic', () => {
  assert.equal(
    adaptationGenerationInputSchema.safeParse({
      sourceType: 'paste',
      title: 'Fractions',
      pastedText: 'Un contenu pédagogique suffisamment détaillé pour être adapté.',
      subject: 'Mathématiques',
      level: 'Secondaire',
      studentIds: [],
    }).success,
    true
  )
  assert.equal(
    adaptationGenerationInputSchema.safeParse({
      sourceType: 'course',
      title: 'Fractions',
      subject: 'Mathématiques',
      level: 'Secondaire',
    }).success,
    false
  )

  assert.equal(resolveStudentVariant(['Dyslexie']), 'dys')
  assert.equal(resolveStudentVariant(['Trouble de concentration']), 'adhd')
  assert.equal(resolveStudentVariant([], true), 'support')
  assert.deepEqual(
    summarizeAnonymousNeeds([
      { needs: ['Dyslexie'], interventionPlan: false },
      { needs: ['Dyslexie'], interventionPlan: false },
      { needs: ['Haut potentiel'], interventionPlan: false },
    ]),
    ['dys: 2', 'enrichment: 1']
  )

  assert.equal(
    generatedVariantSchema.safeParse({
      title: 'Les fractions adaptées',
      summary: 'Une progression adaptée qui conserve les objectifs essentiels du cours.',
      learningObjectives: ['Comprendre la notion de fraction.'],
      sections: [
        {
          heading: 'Découverte',
          content: 'Observer une représentation concrète puis expliquer les parts égales.',
          instructions: ['Observe le schéma.'],
        },
      ],
      exercises: [],
      accommodations: ['Utiliser des consignes courtes et explicites.'],
      teacherNotes: [],
      visualSupports: [],
    }).success,
    true
  )
})

test('export builders are current placeholders', () => {
  assert.equal(buildPdf(), null)
  assert.equal(buildDocx(), null)
})
