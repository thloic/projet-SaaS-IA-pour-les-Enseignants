import { NextResponse } from 'next/server'
import { checkAndIncrementUsage, decrementUsage } from '@/features/billing/server/usage'
import {
  studyQuestionnaireGenerationInputSchema,
  studyQuestionnaireSchema,
} from '@/features/adaptation/schemas/studyQuestionnaireSchema'
import { generateStudyQuestionnaire } from '@/features/adaptation/server/studyQuestionnaireGeneration.service'
import { getCurrentTeacherProfile, getCurrentUser } from '@/features/profile/server/profile'

// Génération à la demande, non persistée : la réponse n'est jamais stockée.
export async function POST(request: Request) {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentTeacherProfile()])
  if (!user) return NextResponse.json({ error: 'Vous devez être connecté.' }, { status: 401 })
  if (!profile) {
    return NextResponse.json({ error: 'Terminez votre profil enseignant.' }, { status: 400 })
  }

  const body: unknown = await request.json().catch(() => null)
  const parsed = studyQuestionnaireGenerationInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Les informations sont invalides.' },
      { status: 400 }
    )
  }

  const usage = await checkAndIncrementUsage(user.id)
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'Vous avez atteint votre limite de générations ce mois-ci.' },
      { status: 403 }
    )
  }

  try {
    const questionnaire = await generateStudyQuestionnaire({
      ...parsed.data,
      language: profile.language,
      signal: request.signal,
    })
    return NextResponse.json(studyQuestionnaireSchema.parse(questionnaire))
  } catch (error) {
    console.error('[adaptation:study-questionnaire] génération impossible', error)
    try {
      await decrementUsage(user.id)
    } catch {
      // Une erreur de remboursement ne doit pas masquer l'erreur de génération.
    }
    return NextResponse.json(
      { error: 'Le questionnaire n’a pas pu être généré. Votre quota a été remboursé.' },
      { status: 500 }
    )
  }
}
