import type { AgentMessage } from '../schemas/agentSchema.ts'
import type { ChatMessage, TextChatMessage, TextMessageStatus } from '../types/conversation.types.ts'
import type { AppLocale } from '../../i18n/locale.ts'

const MAX_REQUEST_MESSAGES = 50

// Une proposition Drive affichée n'est pas du texte, mais le modèle doit la
// connaître pour une demande de suivi (« modifie aussi le titre »).
// Le schéma serveur accepte 8000 caractères par message : l'en-tête et le texte
// doivent rester dessous, sinon toute la requête est refusée.
const MAX_PROPOSAL_HISTORY_CHARS = 7000

function describeDriveProposal(message: Extract<ChatMessage, { kind: 'drive_change_proposal' }>): string {
  const target =
    message.change.type === 'update_doc'
      ? `modification du Google Doc « ${message.targetName} » (fileId : ${message.change.fileId})`
      : `création du Google Doc « ${message.change.name} »`
  const text = message.change.text.slice(0, MAX_PROPOSAL_HISTORY_CHARS)
  return `[Proposition Drive affichée à l’enseignant, en attente de confirmation : ${target}. Texte proposé :]\n${text}`
}

export function buildAgentRequestMessages(
  messages: ChatMessage[],
  nextUserContent: string
): AgentMessage[] {
  const previous = messages.flatMap((message): AgentMessage[] => {
    if (message.kind === 'drive_change_proposal') {
      return [{ role: 'assistant', content: describeDriveProposal(message) }]
    }
    return message.kind === 'text' &&
      message.content.trim() &&
      message.status !== 'pending' &&
      message.status !== 'error'
      ? [{ role: message.role, content: message.content.trim() } satisfies AgentMessage]
      : []
  })
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
