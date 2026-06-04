---
applyTo: "src/features/generation/**"
---

# Instructions — Feature Generation

## Rôle de cette feature
C'est le cœur du produit. Elle gère le formulaire zero-prompt, la construction du prompt, l'appel LLM en streaming et l'affichage du résultat.

## Flux attendu
1. L'enseignant remplit le formulaire (`GenerationForm`)
2. Les données sont validées avec Zod (`generationSchema`)
3. Le profil enseignant est injecté dans le prompt (`buildPrompt`)
4. L'appel LLM est fait via `/api/generate` en streaming
5. Le résultat est affiché progressivement (`GenerationViewer`)
6. Le cours est sauvegardé en base (`generations` table)

## Règles spécifiques
- Le streaming doit utiliser le Vercel AI SDK (`useChat` ou `useCompletion`)
- Le prompt est construit dans `lib/prompts/course.ts` — jamais inline dans le composant
- Le compteur de générations (`generation_count`) est vérifié AVANT l'appel LLM
- Si l'utilisateur est en plan free et dépasse 3 générations : retourner une erreur 403 avec code `LIMIT_REACHED`
- La variante DYS/HPI est un second appel LLM séparé, déclenché uniquement sur action utilisateur
- Toujours sauvegarder le `content_json` structuré, pas juste le texte brut

## Types attendus
```typescript
interface GenerationInput {
  subject: string
  level: string
  country: string
  topic: string
  duration: number // en minutes
  objectives: string[]
  activityTypes: string[]
}

interface GenerationOutput {
  title: string
  sections: CourseSection[]
  evaluation: Evaluation
  metadata: {
    subject: string
    level: string
    duration: number
    generatedAt: string
  }
}
```