export type AITask =
  | 'agent_chat'
  | 'field_extraction'
  | 'translation'
  | 'pat'
  | 'bulletin'
  | 'follow_up_plan'
  | 'meeting_summary'
  | 'parent_email'
  | 'course'
  | 'quiz'
  | 'adaptation'
  | 'exam_variant'
  | 'correction'

export function modelForTask(task: AITask): string {
  if (task === 'field_extraction' || task === 'translation') {
    return process.env.ANTHROPIC_FAST_MODEL ?? 'claude-haiku-4-5'
  }
  return process.env.ANTHROPIC_QUALITY_MODEL
    ?? process.env.ANTHROPIC_MODEL
    ?? 'claude-sonnet-4-5'
}
