'use server'

import { getCurrentUser } from '@/features/profile/server/profile'
import { checkAndIncrementUsage, decrementUsage } from '@/features/billing/server/usage'
import { translateParentEmailDraft } from './generateParentEmailTranslation'
import {
  orchestrateParentEmailTranslation,
  ParentEmailTranslationOrchestrationError,
} from './parentEmailTranslationOrchestration'
import type { ParentEmailDraft } from '../schemas/parentEmailSchema'

const USAGE_FEATURE = 'agent'

export interface ParentEmailTranslationResult {
  data: ParentEmailDraft | null
  error: 'AUTH_REQUIRED' | 'QUOTA_EXCEEDED' | 'TRANSLATION_FAILED' | 'INVALID_INPUT' | null
}

// Action UI (bouton « Traduire » sur la carte) — jamais une intention de chat,
// meme decision architecturale que updateFollowUpPlanItemStatusAction.
export async function translateParentEmailDraftAction(input: {
  subject: string
  body: string
  targetLanguage: string
}): Promise<ParentEmailTranslationResult> {
  const user = await getCurrentUser()
  if (!user) return { data: null, error: 'AUTH_REQUIRED' }

  try {
    const draft = await orchestrateParentEmailTranslation(
      { ...input, trustedUserId: user.id },
      {
        translateParentEmailDraft,
        checkUsage: (userId) => checkAndIncrementUsage(userId, USAGE_FEATURE),
        refundUsage: (userId) => decrementUsage(userId, USAGE_FEATURE),
      }
    )
    return { data: draft, error: null }
  } catch (error) {
    if (
      error instanceof ParentEmailTranslationOrchestrationError &&
      error.code === 'PARENT_EMAIL_TRANSLATION_QUOTA_EXCEEDED'
    ) {
      return { data: null, error: 'QUOTA_EXCEEDED' }
    }
    if (error instanceof ParentEmailTranslationOrchestrationError) {
      return { data: null, error: 'TRANSLATION_FAILED' }
    }
    console.error('[agent:parent-email-translation] entree invalide', error)
    return { data: null, error: 'INVALID_INPUT' }
  }
}
