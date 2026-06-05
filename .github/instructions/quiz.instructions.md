---
applyTo: "src/features/quiz/**"
---

# Instructions — Feature Quiz

## Rôle
Générer automatiquement un quiz lié à un cours existant. Toujours déclenché
après une génération, jamais de manière indépendante au MVP.

## Flux
1. L'enseignant clique "Générer le quiz" sur un cours existant
2. POST /api/quiz { generationId }
3. Récupère le content_json du cours
4. buildQuizPrompt(courseContent) → appel LLM
5. Parse le JSON retourné → sauvegarde dans quizzes
6. Affiche les questions dans QuizViewer

## Format JSON attendu du LLM
Le LLM doit retourner UNIQUEMENT du JSON valide :
{
  "title": "Quiz — [titre du cours]",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "points": 2
    }
  ]
}

## Règles
- Minimum 5 questions, maximum 10
- Mix obligatoire : 60% QCM, 20% vrai/faux, 20% ouvertes
- Toujours parser avec safeParse Zod avant de sauvegarder
- Ne jamais exposer correct_answer côté client avant soumission
- Ne modifie rien d'autre que ce qui est demandé.