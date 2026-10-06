import AgentChat from '@/features/agent/components/AgentChat'
import { getCurrentUser } from '@/features/profile/server/profile'
import { getAICredentialPublicStatus } from '@/features/ai-credentials/server/aiCredentialRepository'

export default async function AgentPage() {
  const user = await getCurrentUser()
  const status = user ? await getAICredentialPublicStatus(user.id) : null
  return <AgentChat initialAISource={status?.source ?? 'included'} />
}
