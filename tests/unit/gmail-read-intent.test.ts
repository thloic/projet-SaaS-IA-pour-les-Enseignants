import assert from 'node:assert/strict'
import test from 'node:test'
import { looksLikeGmailReadRequest } from '../../src/features/agent/server/gmailReadIntent.ts'

test('reconnaît les demandes de recherche dans la boîte mail', () => {
  const positives = [
    'Cherche dans mon Gmail le courriel de la mère de Léa',
    'trouve le dernier courriel de Monsieur Tremblay',
    'Est-ce que j’ai reçu un e-mail du CSS hier ?',
    'regarde ma boîte de réception pour Antoine',
    'recherche les messages de la direction',
  ]
  for (const message of positives) {
    assert.equal(looksLikeGmailReadRequest(message), true, message)
  }
})

test('ne confond pas la rédaction d’un courriel aux parents avec une recherche', () => {
  const parentMessages = [
    'Écris un courriel aux parents de Léa pour son absence',
    'Envoie un courriel à la famille de Samuel via Gmail',
    'Un courriel pour cet élève sur son comportement',
  ]
  for (const message of parentMessages) {
    assert.equal(looksLikeGmailReadRequest(message), false, message)
  }
})

test('ignore les messages sans rapport avec la boîte mail', () => {
  const negatives = [
    'Génère un PAT pour Léa en mathématiques',
    'Quelle est la moyenne de la classe 3B ?',
    'Ajoute une observation sur le comportement de Samuel',
    'Prépare une séquence sur les fractions',
  ]
  for (const message of negatives) {
    assert.equal(looksLikeGmailReadRequest(message), false, message)
  }
})
