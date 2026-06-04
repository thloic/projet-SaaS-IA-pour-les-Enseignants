---
applyTo: "src/app/api/**"
---

# Instructions — API Routes

## Structure obligatoire de chaque route
```typescript
// 1. Validation Zod en entrée
// 2. Vérification auth Supabase
// 3. Vérification des droits (plan, ownership)
// 4. Logique métier
// 5. Réponse typée

export async function POST(req: Request) {
  // 1. Parse + validate
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error }, { status: 400 })
  }

  // 2. Auth
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // 3. Logique...
}
```

## Codes d'erreur standardisés
- `UNAUTHORIZED` : pas de session
- `LIMIT_REACHED` : quota freemium dépassé
- `NOT_FOUND` : ressource introuvable
- `INVALID_INPUT` : validation Zod échouée