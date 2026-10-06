'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/shared/ToastProvider'
import {
  agentStructuredResponseSchema,
} from '@/features/agent/schemas/agentSchema'
import PATReviewCard from '@/features/agent/components/PATReviewCard'
import BulletinReviewCard from '@/features/agent/components/BulletinReviewCard'
import FollowUpPlanCard from '@/features/agent/components/FollowUpPlanCard'
import ParentEmailDraftCard from '@/features/agent/components/ParentEmailDraftCard'
import MeetingSummaryCard from '@/features/agent/components/MeetingSummaryCard'
import VoiceInputButton from '@/features/agent/components/VoiceInputButton'
import AgentWorkspaceShell from '@/features/agent/components/AgentWorkspaceShell'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import { agentTranslations } from '@/features/agent/i18n/agentTranslations'
import { AGENT_LIMIT_REACHED_MESSAGES } from '@/features/billing/upgradeMessages'
import { useBilling } from '@/features/billing/hooks/useBilling'
import { toAgentPlainText } from '@/features/agent/utils/plainText'
import type { ChatMessage } from '@/features/agent/types/conversation.types'
import { composeVoiceDraft } from '@/features/agent/utils/audioRecorder'
import {
  appendPendingTurn,
  buildAgentRequestMessages,
  buildClarificationContinuation,
  findTextMessage,
  replaceConversationMessage,
  updateAssistantText,
} from '@/features/agent/utils/conversationState'

const BRAND = '#534AB7'
// Tab-scope uniquement : evite de perdre la conversation lors d'un aller-retour
// OAuth (connexion Gmail/Drive), qui est une navigation plein-page, pas une
// fonction d'historique persistant entre appareils.
const CONVERSATION_STORAGE_KEY = 'educassist-agent-conversation'

const UPGRADE_CTA_LABEL: Record<'fr' | 'en' | 'es', string> = {
  fr: 'Passer au plan Pro →',
  en: 'Upgrade to Pro →',
  es: 'Pasar al plan Pro →',
}

export default function AgentChat({ initialAISource = 'included' }: { initialAISource?: 'included' | 'personal' }) {
  const { showToast } = useToast()
  const { locale } = useAppLocale()
  const { startCheckout, pendingAction } = useBilling()
  const copy = agentTranslations[locale]
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isVoiceBusy, setIsVoiceBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const voiceDraftBaseRef = useRef('')

  // Restaure la conversation apres un aller-retour OAuth (navigation
  // plein-page) : initialise toujours a vide pour eviter un ecart
  // d'hydratation SSR/client, puis recharge juste apres le montage.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(CONVERSATION_STORAGE_KEY)
      // Synchronisation ponctuelle depuis sessionStorage (systeme externe) au
      // montage — pas de risque de rendus en cascade, ceci ne s'execute qu'une
      // seule fois par montage de page.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setMessages(JSON.parse(raw) as ChatMessage[])
    } catch {
      // stockage indisponible (navigation privee, quota) — pas bloquant
    }
  }, [])

  useEffect(() => {
    try {
      if (messages.length > 0) {
        window.sessionStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(messages))
      } else {
        window.sessionStorage.removeItem(CONVERSATION_STORAGE_KEY)
      }
    } catch {
      // stockage indisponible — la conversation reste fonctionnelle en memoire
    }
  }, [messages])

  // Confirmation visuelle du retour de connexion Google (connexion Gmail/Drive,
  // voir docs/PRD-agent-envoi-gmail-drive.md) : sans ca, rien n'indiquait que
  // la connexion avait reussi puisque la redirection OAuth recharge la page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleStatus = params.get('google')
    if (!googleStatus) return

    if (googleStatus === 'connected') {
      showToast(copy.googleConnected, 'success')
    } else if (googleStatus === 'error') {
      showToast(copy.googleConnectFailed, 'error')
    }

    params.delete('google')
    const query = params.toString()
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleQuickAction(prompt: string) {
    setInput(prompt)
  }

  function handleNewConversation() {
    abortControllerRef.current?.abort()
    setMessages([])
    setInput('')
    setError(null)
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    const requestMessages = buildAgentRequestMessages(messages, trimmed)
    const userMessageId = crypto.randomUUID()
    const assistantMessageId = crypto.randomUUID()
    setMessages((current) => appendPendingTurn(current, trimmed, userMessageId, assistantMessageId))
    setInput('')
    setError(null)
    setIsStreaming(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: requestMessages,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? copy.responseFailed)
      }

      if (response.headers.get('content-type')?.includes('application/json')) {
        const rawJson = await response.json()
        const structured = agentStructuredResponseSchema.safeParse(rawJson)
        if (!structured.success) {
          console.error('[agent:chat] réponse structurée invalide côté client', structured.error.issues, rawJson)
          throw new Error(copy.invalidStructured)
        }
        console.log('[agent:chat] réponse structurée reçue', structured.data.kind, structured.data)

        setMessages((current) => {
          if (structured.data.kind === 'pat') {
            return replaceConversationMessage(current, assistantMessageId, {
                id: assistantMessageId,
                kind: 'pat',
                role: 'assistant',
                studentId: structured.data.studentId,
                language: structured.data.language,
                pat: structured.data.pat,
              })
          }
          if (structured.data.kind === 'bulletin') {
            return replaceConversationMessage(current, assistantMessageId, {
                id: assistantMessageId,
                kind: 'bulletin',
                role: 'assistant',
                subject: structured.data.subject,
                grade: structured.data.grade,
                comment: structured.data.comment,
              })
          }
          if (structured.data.kind === 'follow_up_plan') {
            return replaceConversationMessage(current, assistantMessageId, {
                id: assistantMessageId,
                kind: 'follow_up_plan',
                role: 'assistant',
                studentId: structured.data.studentId,
                planId: structured.data.planId,
                items: structured.data.items,
              })
          }
          if (structured.data.kind === 'parent_email_draft') {
            return replaceConversationMessage(current, assistantMessageId, {
                id: assistantMessageId,
                kind: 'parent_email_draft',
                role: 'assistant',
                studentId: structured.data.studentId,
                draftId: structured.data.draftId,
                register: structured.data.register,
                subject: structured.data.subject,
                body: structured.data.body,
                familyLanguage: structured.data.familyLanguage,
                suggestedRecipientEmail: structured.data.suggestedRecipientEmail,
              })
          }
          if (structured.data.kind === 'meeting_summary') {
            return replaceConversationMessage(current, assistantMessageId, {
                id: assistantMessageId,
                kind: 'meeting_summary',
                role: 'assistant',
                studentId: structured.data.studentId,
                summaryId: structured.data.summaryId,
                subjectsDiscussed: structured.data.subjectsDiscussed,
                agreementsReached: structured.data.agreementsReached,
                nextSteps: structured.data.nextSteps,
              })
          }
          return replaceConversationMessage(current, assistantMessageId, {
              id: assistantMessageId,
              kind: 'text',
              role: 'assistant',
              content: toAgentPlainText(structured.data.message),
              status: 'complete',
              candidates:
                structured.data.kind === 'clarification'
                  ? structured.data.candidates
                  : undefined,
              originalRequest:
                structured.data.kind === 'clarification' ? trimmed : undefined,
            })
        })
        return
      }

      if (!response.body) throw new Error(copy.emptyResponse)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((current) => {
          const pending = findTextMessage(current, assistantMessageId)
          if (!pending) return current
          return updateAssistantText(
            current,
            assistantMessageId,
            toAgentPlainText(pending.content + chunk)
          )
        })
      }
      setMessages((current) => {
        const completed = findTextMessage(current, assistantMessageId)
        return completed
          ? updateAssistantText(current, assistantMessageId, completed.content, 'complete')
          : current
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setMessages((current) => {
          const interrupted = findTextMessage(current, assistantMessageId)
          return interrupted
            ? updateAssistantText(current, assistantMessageId, interrupted.content, 'interrupted')
            : current
        })
        return
      }
      const message = err instanceof Error ? err.message : copy.responseFailed
      console.error('[agent] échec du chat', err)
      setError(message)
      showToast(message, 'error')
      setInput((current) => current || trimmed)
      setMessages((current) => {
        const failed = findTextMessage(current, assistantMessageId)
        if (!failed) return current
        return updateAssistantText(
          current,
          assistantMessageId,
          failed.content || copy.failedTurn,
          'error'
        )
      })
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  const composer = (
    <div className="flex items-end gap-2 rounded-2xl border border-border/80 bg-background p-2 shadow-sm transition focus-within:border-[#534AB7]/45 focus-within:ring-4 focus-within:ring-[#534AB7]/5">
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={copy.placeholder}
        rows={2}
        disabled={isStreaming || isVoiceBusy}
        className="max-h-36 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 disabled:cursor-wait"
      />
      <VoiceInputButton
        locale={locale}
        disabled={isStreaming}
        onBusyChange={setIsVoiceBusy}
        onDictationStart={() => {
          voiceDraftBaseRef.current = input
        }}
        onDictationCancel={() => {
          setInput(voiceDraftBaseRef.current)
        }}
        onLiveTranscript={(text) => {
          setInput(composeVoiceDraft(voiceDraftBaseRef.current, text))
        }}
        onTranscript={(text) => {
          setInput(composeVoiceDraft(voiceDraftBaseRef.current, text))
        }}
      />
      {isStreaming && (
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl"
          onClick={() => abortControllerRef.current?.abort()}
        >
          {copy.stop}
        </Button>
      )}
      <Button
        type="button"
        className="h-11 w-11 shrink-0 rounded-xl p-0 text-white shadow-md shadow-[#534AB7]/20"
        style={{ backgroundColor: BRAND }}
        disabled={isStreaming || isVoiceBusy || !input.trim()}
        onClick={() => void handleSend()}
        aria-label={copy.placeholder}
      >
        {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={17} />}
      </Button>
    </div>
  )

  return (
    <AgentWorkspaceShell
      locale={locale}
      aiSource={initialAISource}
      hasMessages={messages.length > 0}
      busy={isStreaming || isVoiceBusy}
      error={error}
      onNewConversation={handleNewConversation}
      onQuickAction={handleQuickAction}
      composer={composer}
    >
      {messages.map((message) =>
            message.kind === 'pat' ? (
              <PATReviewCard key={message.id} initialPAT={message.pat} documentLanguage={message.language} />
            ) : message.kind === 'bulletin' ? (
              <BulletinReviewCard
                key={message.id}
                subject={message.subject}
                grade={message.grade}
                initialComment={message.comment}
              />
            ) : message.kind === 'follow_up_plan' ? (
              <FollowUpPlanCard key={message.id} planId={message.planId} items={message.items} />
            ) : message.kind === 'parent_email_draft' ? (
              <ParentEmailDraftCard
                key={message.id}
                draftId={message.draftId}
                register={message.register}
                initialSubject={message.subject}
                initialBody={message.body}
                familyLanguage={message.familyLanguage}
                suggestedRecipientEmail={message.suggestedRecipientEmail}
              />
            ) : message.kind === 'meeting_summary' ? (
              <MeetingSummaryCard
                key={message.id}
                initialSubjectsDiscussed={message.subjectsDiscussed}
                initialAgreementsReached={message.agreementsReached}
                initialNextSteps={message.nextSteps}
              />
            ) : (
              <div
                key={message.id}
                className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[78%] ${
                  message.role === 'user'
                    ? 'ml-auto rounded-br-md text-white'
                    : 'mr-auto rounded-bl-md border border-border/60 bg-card text-foreground'
                }`}
                style={message.role === 'user' ? { backgroundColor: BRAND } : {}}
              >
                {message.content || (message.status === 'pending' ? '…' : '')}
                {message.role === 'assistant' && message.status === 'interrupted' && (
                  <p className="mt-2 text-xs text-muted-foreground">{copy.interrupted}</p>
                )}
                {message.role === 'assistant' &&
                  Object.values(AGENT_LIMIT_REACHED_MESSAGES).includes(message.content) && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => startCheckout('month')}
                        disabled={pendingAction !== null}
                        className="inline-block rounded-full px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                        style={{ backgroundColor: BRAND }}
                      >
                        {UPGRADE_CTA_LABEL[locale]}
                      </button>
                    </div>
                  )}
                {message.candidates && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.candidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => setInput(buildClarificationContinuation(
                          message.originalRequest ?? '',
                          candidate.fullName,
                          locale
                        ))}
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-muted"
                      >
                        {candidate.fullName}
                        {candidate.classes.length > 0 ? ` · ${candidate.classes.join(', ')}` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
      )}
    </AgentWorkspaceShell>
  )
}
