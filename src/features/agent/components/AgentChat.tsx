'use client'

import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Loader2, MessageCircle, MessageSquareText, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/shared/ToastProvider'
import {
  agentStructuredResponseSchema,
} from '@/features/agent/schemas/agentSchema'
import PATReviewCard from '@/features/agent/components/PATReviewCard'
import BulletinReviewCard from '@/features/agent/components/BulletinReviewCard'
import FollowUpPlanCard from '@/features/agent/components/FollowUpPlanCard'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import { agentTranslations } from '@/features/agent/i18n/agentTranslations'
import { AGENT_LIMIT_REACHED_MESSAGES } from '@/features/billing/upgradeMessages'
import { useBilling } from '@/features/billing/hooks/useBilling'
import { toAgentPlainText } from '@/features/agent/utils/plainText'
import type { ChatMessage } from '@/features/agent/types/conversation.types'
import {
  appendPendingTurn,
  buildAgentRequestMessages,
  buildClarificationContinuation,
  findTextMessage,
  replaceConversationMessage,
  updateAssistantText,
} from '@/features/agent/utils/conversationState'

const BRAND = '#534AB7'

const UPGRADE_CTA_LABEL: Record<'fr' | 'en' | 'es', string> = {
  fr: 'Passer au plan Pro →',
  en: 'Upgrade to Pro →',
  es: 'Pasar al plan Pro →',
}

export default function AgentChat() {
  const { showToast } = useToast()
  const { locale } = useAppLocale()
  const { startCheckout, pendingAction } = useBilling()
  const copy = agentTranslations[locale]
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  function handleQuickAction(prompt: string) {
    setInput(prompt)
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
        const structured = agentStructuredResponseSchema.safeParse(await response.json())
        if (!structured.success) throw new Error(copy.invalidStructured)

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

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-primary/10">
          <MessageCircle size={22} style={{ color: BRAND }} />
        </div>
        <div>
          <h1 className="text-2xl font-black">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {copy.quick.map(([label, prompt]) => (
          <button
            key={label}
            type="button"
            onClick={() => handleQuickAction(prompt)}
            className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-card/40 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <MessageSquareText size={20} style={{ color: BRAND }} />
            <p>{copy.empty}</p>
          </div>
        ) : (
          messages.map((message) =>
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
            ) : (
              <div
                key={message.id}
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'ml-auto text-white'
                    : 'mr-auto bg-muted/60 text-foreground'
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
          )
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={copy.placeholder}
          rows={2}
          className="flex-1 resize-none rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
        {isStreaming && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => abortControllerRef.current?.abort()}
          >
            {copy.stop}
          </Button>
        )}
        <Button
          type="button"
          className="h-11 gap-2 text-white"
          style={{ backgroundColor: BRAND }}
          disabled={isStreaming || !input.trim()}
          onClick={() => void handleSend()}
        >
          {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </Button>
      </div>
    </div>
  )
}
