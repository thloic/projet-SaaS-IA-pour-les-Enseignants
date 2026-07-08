'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTeacherProfile, getCurrentUser } from '@/features/profile/server/profile'
import { generatedQuizSchema, quizGenerationInputSchema, quizUpdateSchema } from '@/features/quiz/schemas/quizSchema'
import { generateQuizFromContent } from '@/features/quiz/server/quizGeneration.service'

export interface GenerateQuizState {
  error: string | null
  quizId: string | null
}

export interface UpdateQuizState {
  error: string | null
  success: boolean
}

export interface DeleteQuizState {
  error: string | null
}

const GENERIC_GENERATION_ERROR = 'La génération du quiz a échoué, réessayez dans un instant.'
const GENERIC_SAVE_ERROR = 'Le quiz n’a pas pu être enregistré, réessayez dans un instant.'

export async function generateQuizAction(
  _prevState: GenerateQuizState,
  formData: FormData
): Promise<GenerateQuizState> {
  const parsedInput = quizGenerationInputSchema.safeParse({
    sourceDocumentId: formData.get('sourceDocumentId') || undefined,
    pastedText: formData.get('pastedText') || undefined,
    subject: formData.get('subject') || undefined,
    questionCount: formData.get('questionCount') || 5,
  })

  if (!parsedInput.success) {
    return {
      error: parsedInput.error.issues[0]?.message ?? 'Completez le formulaire avant de générer le quiz.',
      quizId: null,
    }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Vous devez être connecté pour générer un quiz.', quizId: null }
  }

  const profile = await getCurrentTeacherProfile()
  if (!profile) {
    return { error: 'Terminez votre profil enseignant avant de générer un quiz.', quizId: null }
  }

  try {
    const supabase = await createClient()
    let sourceText = parsedInput.data.pastedText?.trim() ?? ''
    let sourceDocumentId: string | null = null

    if (parsedInput.data.sourceDocumentId) {
      const { data, error } = await supabase
        .from('source_documents')
        .select('id, content_text')
        .eq('id', parsedInput.data.sourceDocumentId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('[quiz] lecture document source refusee', error)
        return { error: GENERIC_GENERATION_ERROR, quizId: null }
      }

      if (!data) {
        return { error: 'Ce document source est introuvable ou inaccessible.', quizId: null }
      }

      sourceDocumentId = data.id
      sourceText = data.content_text.trim()
    }

    if (!sourceText) {
      return { error: 'Ajoutez un contenu de cours avant de générer le quiz.', quizId: null }
    }

    const generatedQuiz = await generateQuizFromContent({
      content: sourceText,
      gradingSystem: profile.grading_system,
      questionCount: parsedInput.data.questionCount,
      subject: parsedInput.data.subject,
      level: profile.levels?.[0],
    })

    const validatedQuiz = generatedQuizSchema.safeParse(generatedQuiz)
    if (!validatedQuiz.success) {
      console.error('[quiz] validation du quiz genere echouee', validatedQuiz.error.flatten())
      return { error: GENERIC_GENERATION_ERROR, quizId: null }
    }

    const { data: inserted, error: insertError } = await supabase
      .from('quizzes')
      .insert({
        user_id: user.id,
        source_document_id: sourceDocumentId,
        title: validatedQuiz.data.title,
        subject: parsedInput.data.subject,
        source_text_snapshot: sourceText,
        grading_system: profile.grading_system,
        total_points: validatedQuiz.data.totalPoints,
        questions: validatedQuiz.data.questions,
      })
      .select('id, user_id')
      .eq('user_id', user.id)
      .single()

    if (insertError || !inserted || inserted.user_id !== user.id) {
      console.error('[quiz] insertion refusee', insertError)
      return { error: GENERIC_SAVE_ERROR, quizId: null }
    }

    revalidatePath('/quiz')
    revalidatePath(`/quiz/${inserted.id}`)
    return { error: null, quizId: inserted.id }
  } catch (error) {
    console.error('[quiz] echec generation', error)
    return { error: GENERIC_GENERATION_ERROR, quizId: null }
  }
}

export async function updateQuizAction(
  _prevState: UpdateQuizState,
  formData: FormData
): Promise<UpdateQuizState> {
  const rawQuestions = String(formData.get('questions') ?? '')
  let questions: unknown

  try {
    questions = JSON.parse(rawQuestions)
  } catch (error) {
    console.error('[quiz] JSON edition invalide', error)
    return { error: 'Les modifications du quiz sont invalides. Rechargez la page puis réessayez.', success: false }
  }

  const parsed = quizUpdateSchema.safeParse({
    quizId: formData.get('quizId'),
    title: formData.get('title'),
    questions,
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Les modifications du quiz sont invalides.',
      success: false,
    }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Vous devez être connecté pour modifier ce quiz.', success: false }
  }

  try {
    const totalPoints = parsed.data.questions.reduce((sum, question) => sum + question.points, 0)
    const supabase = await createClient()
    const { error } = await supabase
      .from('quizzes')
      .update({
        title: parsed.data.title,
        questions: parsed.data.questions,
        total_points: totalPoints,
      })
      .eq('id', parsed.data.quizId)
      .eq('user_id', user.id)

    if (error) {
      console.error('[quiz] mise a jour refusee', error)
      return { error: 'Les modifications n’ont pas pu être enregistrées.', success: false }
    }

    revalidatePath('/quiz')
    revalidatePath(`/quiz/${parsed.data.quizId}`)
    return { error: null, success: true }
  } catch (error) {
    console.error('[quiz] echec mise a jour', error)
    return { error: 'Les modifications n’ont pas pu être enregistrées.', success: false }
  }
}

export async function deleteQuizAction(
  _prevState: DeleteQuizState,
  formData: FormData
): Promise<DeleteQuizState> {
  const quizId = String(formData.get('quizId') ?? '')
  if (!quizId) {
    return { error: 'Quiz introuvable.' }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Vous devez être connecté pour supprimer ce quiz.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId)
      .eq('user_id', user.id)

    if (error) {
      console.error('[quiz] suppression refusee', error)
      return { error: 'Le quiz n’a pas pu être supprimé.' }
    }

    revalidatePath('/quiz')
  } catch (error) {
    console.error('[quiz] echec suppression', error)
    return { error: 'Le quiz n’a pas pu être supprimé.' }
  }

  redirect('/quiz?deleted=1')
}
