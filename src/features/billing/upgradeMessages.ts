// Messages exacts affichés quand un enseignant atteint sa limite de
// générations gratuites (voir src/app/api/agent/chat/route.ts et les autres
// points d'entrée qui appellent checkAndIncrementUsage). Partagé avec
// AgentChat.tsx pour détecter ce message précis côté client et y ajouter un
// lien vers l'abonnement, sans dupliquer ni fragiliser la logique de blocage.
export const AGENT_LIMIT_REACHED_MESSAGES: Record<'fr' | 'en' | 'es', string> = {
  fr: 'Vous avez atteint votre limite de générations gratuites pour l’agent ce mois-ci.',
  en: 'You have reached your free agent generation limit for this month.',
  es: 'Has alcanzado el límite de generaciones gratuitas del agente para este mes.',
}
