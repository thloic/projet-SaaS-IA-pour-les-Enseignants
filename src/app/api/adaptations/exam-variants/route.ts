import { NextResponse } from 'next/server'
import { checkAndIncrementUsage, decrementUsage } from '@/features/billing/server/usage'
import {
  examVariantGenerationInputSchema,
  examVariantSetSchema,
} from '@/features/adaptation/schemas/examVariantSchema'
import { generateExamVariantSet } from '@/features/adaptation/server/examVariantGeneration.service'
import { getCurrentTeacherProfile, getCurrentUser } from '@/features/profile/server/profile'

export async function POST(request: Request) {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentTeacherProfile()])
  if (!user) return NextResponse.json({ error: 'Vous devez être connecté.' }, { status: 401 })
  if (!profile) {
    return NextResponse.json({ error: 'Terminez votre profil enseignant.' }, { status: 400 })
  }

  const body: unknown = await request.json().catch(() => null)
  const parsed = examVariantGenerationInputSchema.safeParse(body)
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
    const variants = await generateExamVariantSet({
      ...parsed.data,
      language: profile.language,
      signal: request.signal,
    })
    return NextResponse.json(examVariantSetSchema.parse(variants))
  } catch (error) {
    console.error('[adaptation:exam-variant] génération impossible', error)
    try {
      await decrementUsage(user.id)
    } catch {
      // Une erreur de remboursement ne doit pas masquer l'erreur de génération.
    }
    return NextResponse.json(
      { error: 'Les variantes n’ont pas pu être générées. Votre quota a été remboursé.' },
      { status: 500 }
    )
  }
}
