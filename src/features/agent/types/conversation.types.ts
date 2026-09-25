import type { AgentStructuredResponse } from '../schemas/agentSchema.ts'
import type { PAT } from '../schemas/patSchema.ts'
import type { ContentLanguage } from '../../i18n/locale.ts'

export type TextMessageStatus = 'complete' | 'pending' | 'interrupted' | 'error'

export interface TextChatMessage {
  id: string
  kind: 'text'
  role: 'user' | 'assistant'
  content: string
  status: TextMessageStatus
  candidates?: Extract<AgentStructuredResponse, { kind: 'clarification' }>['candidates']
  originalRequest?: string
}

export interface PATChatMessage {
  id: string
  kind: 'pat'
  role: 'assistant'
  studentId: string
  language: ContentLanguage
  pat: PAT
}

export interface BulletinChatMessage {
  id: string
  kind: 'bulletin'
  role: 'assistant'
  subject: string
  grade: string
  comment: string
}

export interface FollowUpPlanChatMessage {
  id: string
  kind: 'follow_up_plan'
  role: 'assistant'
  studentId: string
  planId: string
  items: Extract<AgentStructuredResponse, { kind: 'follow_up_plan' }>['items']
}

export type ChatMessage =
  | TextChatMessage
  | PATChatMessage
  | BulletinChatMessage
  | FollowUpPlanChatMessage
