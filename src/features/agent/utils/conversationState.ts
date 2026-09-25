import type { AgentMessage } from '../schemas/agentSchema.ts'
import type { ChatMessage, TextChatMessage, TextMessageStatus } from '../types/conversation.types.ts'
import type { AppLocale } from '../../i18n/locale.ts'

const MAX_REQUEST_MESSAGES = 50

export function buildAgentRequestMessages(
  messages: ChatMessage[],
  nextUserContent: string
): AgentMessage[] {
  const previous = messages.flatMap((message) =>
    message.kind === 'text' &&
    message.content.trim() &&
    message.status !== 'pending' &&
    message.status !== 'error'
      ? [{ role: message.role, content: message.content.trim() } satisfies AgentMessage]
      : []
  )
  return [...previous, { role: 'user' as const, content: nextUserContent.trim() }]
    .slice(-MAX_REQUEST_MESSAGES)
}

export function appendPendingTurn(
  messages: ChatMessage[],
  content: string,
  userMessageId: string,
  assistantMessageId: string
): ChatMessage[] {
  return [
    ...messages,
    { id: userMessageId, kind: 'text', role: 'user', content, status: 'complete' },
    { id: assistantMessageId, kind: 'text', role: 'assistant', content: '', status: 'pending' },
  ]
}

export function replaceConversationMessage(
  messages: ChatMessage[],
  messageId: string,
  replacement: ChatMessage
): ChatMessage[] {
  return messages.map((message) => message.id === messageId ? replacement : message)
}

export function updateAssistantText(
  messages: ChatMessage[],
  messageId: string,
  content: string,
  status: TextMessageStatus = 'pending'
): ChatMessage[] {
  return messages.map((message) =>
    message.id === messageId && message.kind === 'text' && message.role === 'assistant'
      ? { ...message, content, status }
      : message
  )
}

export function buildClarificationContinuation(
  originalRequest: string,
  studentFullName: string,
  locale: AppLocale
): string {
  const normalized = originalRequest.toLocaleLowerCase('fr')
  if (/\bpat\b|plan d['’]appui|support plan|plan de apoyo/u.test(normalized)) {
    return locale === 'en'
      ? `Generate the support plan for ${studentFullName}`
      : locale === 'es'
        ? `Genera el PAT de ${studentFullName}`
        : `Génère le PAT de ${studentFullName}`
  }
  if (/plan de suivi|student follow-up|follow-up plan|plan de seguimiento/u.test(normalized)) {
    return locale === 'en'
      ? `Generate a follow-up plan for ${studentFullName}`
      : locale === 'es'
        ? `Genera un plan de seguimiento para ${studentFullName}`
        : `Génère un plan de suivi pour ${studentFullName}`
  }
  const selection = locale === 'en'
    ? `Selected student: ${studentFullName}.`
    : locale === 'es'
      ? `Alumno seleccionado: ${studentFullName}.`
      : `Élève sélectionné : ${studentFullName}.`
  return `${selection}\n${originalRequest.trim()}`
}

export function findTextMessage(messages: ChatMessage[], id: string): TextChatMessage | undefined {
  const message = messages.find((item) => item.id === id)
  return message?.kind === 'text' ? message : undefined
}
