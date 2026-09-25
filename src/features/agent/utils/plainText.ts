// L'agent conversationnel doit rester lisible comme une conversation simple.
// Cette normalisation est une protection d'affichage : la consigne principale
// reste dans le prompt, mais un modèle peut malgré tout produire du Markdown.
export function toAgentPlainText(value: string): string {
  return value
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
}
