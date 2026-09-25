# EducAssist — Spécification de l'Agent IA (V1)

> **Document de référence unique** pour toutes les sessions Claude Code portant sur l'agent IA.
> À lire au début de chaque session avant de coder. Toute décision qui contredit ce fichier doit être remontée avant implémentation.
>
> Statut : V1 démo · Rédigé pour cadrer un premier livrable montrable au client (Bénédict).

---

## 1. Ce qu'est l'agent (et ce qu'il n'est pas)

**L'agent EducAssist est un assistant pédagogique conversationnel, ancré dans le contexte de l'enseignant, qui génère et met à jour des documents institutionnels à partir des informations sur ses élèves.**

Après connexion, l'enseignant atterrit sur l'agent. Ce n'est PAS une 4e boîte à formulaire à côté de cours/quiz/bulletin : c'est une **surface conversationnelle** qui sait faire des tâches concrètes, amorcées par des **actions rapides**.

### Frontières V1 (à ne PAS franchir sans validation)

| L'agent V1 FAIT | L'agent V1 ne fait PAS (reporté) |
|---|---|
| Chat contextuel (connaît le profil enseignant : matière, niveau, pays) | Tool calling / connecteurs Google Drive / Sheets en écriture réelle |
| Génère un document structuré à partir d'infos collées ou saisies | Lit automatiquement le Drive de l'enseignant |
| Actions rapides qui pré-cadrent la conversation | Relances quotidiennes / rapports automatiques planifiés (cron) |
| Streaming de la réponse (réutilise le pattern `streamText` existant) | Multi-agents / orchestrateur |
| Export du livrable (PDF/DOCX, réutilise l'existant) | Gestion de l'horaire / calendrier cyclique (4j/5j) |

> **Décision d'architecte tranchée :** pas de tool calling réel en V1. L'agent *génère*, il n'*agit* pas encore sur des systèmes externes. Les connecteurs viendront quand le périmètre sera confirmé avec le client. Ne pas câbler d'API Google.

---

## 2. Le vrai besoin client (d'où vient cette spec)

Le client (enseignant à l'intermédiaire 7e/8e au Canada, école francophone) travaille sur des **données élèves structurées et récurrentes** et perd un temps considérable à **recopier et reformuler** ces données dans des documents institutionnels, chaque année, pour chaque élève.

Ses tâches réelles observées :
- Il maintient un **tableau d'adaptations** (matrice élèves × types d'adaptations) + une fiche diagnostic par élève (TDAH, dyslexie, anxiété, nouvel arrivant, etc.).
- Il doit remplir un **PAT** (Plan d'Appui Temporaire) — gabarit Word institutionnel — pour chaque élève suivi, en repartant des infos de l'année précédente.
- Il veut un **suivi d'évolution** des élèves (progrès, interventions) qui alimente ensuite les commentaires de bulletin.

Le fil rouge : **les infos existent déjà quelque part → l'agent doit les comprendre et produire le document cible reformulé de façon bienveillante et institutionnelle.** C'est exactement le pipeline du MVP (contexte → génération IA → livrable validé → export), appliqué à un nouveau type de livrable.

> Ces documents sont fournis par le client comme **exemples représentatifs**, pas comme le périmètre définitif. On construit donc l'agent de façon **générique** : le PAT est *un* cas d'usage, pas le produit. Ne jamais coder « PSAC », « PAT », « cycle 8 jours » comme des concepts en dur dans le cœur de l'agent — ce sont des instances de templates.

---

## 3. Comportement de l'agent (system prompt métier)

Aligné sur le System Prompt pédagogique déjà écrit par le client. Points à implémenter dans le prompt système de l'agent :

- **Langue** : détecte et répond dans la langue de l'enseignant. Respecte les variantes régionales (français du Canada ici : « courriel », « bulletin », « évaluation formative » et non « examen »).
- **Contexte injecté silencieusement** : profil enseignant (matière, niveau, pays/programme) inséré dans chaque génération sans que l'enseignant le rappelle.
- **Adaptation géographique** : notation et terminologie du pays. Ici contexte canadien francophone (Ontario/Québec selon profil).
- **Reformulation bienveillante (règle dure, héritée des bulletins)** : jamais de formulation négative directe sur un élève. Les difficultés sont toujours reformulées en **besoins** et **axes de progrès**. Cette règle s'applique à TOUS les documents élèves générés (PAT, suivi, bulletin).
- **Anti-hallucination** : si une information manque pour remplir un champ, l'agent le signale et demande, il n'invente jamais une donnée sur un élève.
- **Confidentialité** : données d'un élève jamais mêlées à celles d'un autre. Isolation stricte par enseignant (voir §6).
- **Ton** : professionnel avec l'enseignant, reconnaît sa charge de travail, proactif (propose la tâche suivante logique).

---

## 4. Actions rapides V1 (ce qui amorce le chat)

Trois actions rapides au lancement de l'agent. Chacune pré-remplit la conversation avec un cadrage. L'enseignant garde la liberté de taper librement.

### Action A — « Générer un plan d'appui (PAT) » ⭐ action vitrine
Le cas d'usage le plus impressionnant pour une démo. Flux :
1. L'enseignant fournit les infos de l'élève (saisie libre, ou collage du tableau/ancien plan). En V1 : **il colle ou tape**, l'agent ne va pas chercher tout seul.
2. L'agent structure ces infos dans le format PAT (voir §5 pour le schéma).
3. Génération en streaming, reformulation bienveillante appliquée.
4. Aperçu structuré → export DOCX/PDF.

### Action B — « Rédiger un commentaire de bulletin »
Réutilise la feature bulletin existante, mais accessible dans le fil conversationnel. Nom de l'élève + note + observations → commentaire 3–6 lignes, 3 tons, jamais de négatif direct.

### Action C — « Préparer un suivi d'élève »
À partir d'infos sur un élève (adaptations en place, observations récentes), l'agent produit une entrée de suivi structurée (interventions faites, progrès, prochaines étapes). Base future du tableau de suivi automatisé.

> Priorité d'implémentation : **A d'abord** (vitrine), puis B (réutilisation), puis C.

---

## 5. Schéma de sortie — PAT (Plan d'Appui Temporaire)

Structure dérivée du gabarit institutionnel réel. À valider en Zod avant tout rendu/export (règle projet : toute sortie IA est Zod-validée).

```ts
// Le PAT est UNE instance de "document template". Structurer génériquement.
const PATSchema = z.object({
  eleve: z.object({
    nom: z.string(),
    niveau: z.string().optional(),        // ex: "8e année"
    profil: z.string().optional(),        // ex: "Apprenant de la langue / nouvel arrivant"
  }),
  habiletes: z.object({
    forces: z.array(z.string()),
    besoins: z.array(z.string()),         // formulés en axes de progrès, jamais en négatif
  }),
  comportementsCibles: z.array(z.object({
    date: z.string().optional(),
    habilete: z.string(),                 // comportement/habileté ciblé
    interventionsPrevues: z.string(),
    preuvesProgression: z.string().optional(),
  })),
  modalitesAppui: z.array(z.string()),    // ex: "appui individuel en retrait", "enseignement en petit groupe"
  adaptationsOffertes: z.array(z.string()), // ex: "Temps supplémentaire", "Reformulation des consignes", "Technologie d'assistance"
  recommandationsPSAC: z.string().optional(),
  francisation: z.object({                // optionnel — seulement si élève en francisation
    communicationOrale: z.string().optional(),
    lecture: z.string().optional(),
    ecriture: z.string().optional(),
    besoins: z.array(z.string()).optional(),
  }).optional(),
});
```

> **Discipline mock-as-contract (règle projet) :** implémenter d'abord un PAT mocké hardcodé au format final exact, valider tout le pipeline (génération → Zod → aperçu → export), PUIS brancher l'IA réelle. Ne pas connecter l'IA avant que le mock traverse toute la chaîne.

---

## 6. Contraintes techniques (non négociables — héritées du projet)

- **Stack** : Next.js, TypeScript strict, Tailwind + shadcn/ui, Supabase (auth + DB + RLS), Vercel AI SDK, déploiement Vercel.
- **Point de branchement IA unique** : tous les appels IA passent par un seul point d'isolation (facilite le switch mock/réel et les tests). L'agent ne crée pas un 2e chemin d'appel parallèle.
- **Clé API Anthropic** : côté serveur strict, jamais de préfixe `NEXT_PUBLIC_`. La clé est sur le compte du client, pas le tien.
- **Zod obligatoire** : toute sortie IA validée avant insertion DB ou rendu. Parsing JSON défensif toujours.
- **RLS** : toute nouvelle table Supabase → RLS activé + 4 policies + filtrage `user_id` explicite en requête serveur.
- **Données élèves = données sensibles de mineurs.** Pour toute démo : prénoms fictifs ou anonymisation. Jamais de vrais dossiers d'enfants dans les logs. Pas d'entraînement de modèle sur ces données (garantie contractuelle du produit).
- **Erreurs** : jamais d'erreur technique brute au frontend — messages naturels en français.
- **Quota freemium** : l'usage de l'agent décompte du quota via le même RPC atomique existant. Ne pas créer un compteur parallèle.

---

## 7. Ce qu'on ne construit pas maintenant (dette évitée sciemment)

Reporté explicitement, à ne pas commencer sans décision produit avec le client :
- Lecture/écriture automatique dans Google Drive & Sheets (dépendance OAuth, délai connu).
- Import automatique d'une classe depuis un xlsx (le parsing de la matrice réelle est bordélique : dates parasites en en-têtes, cellules multi-noms, tags « (PAT) » manuels — c'est un chantier de nettoyage à part entière).
- Relances quotidiennes, rapports hebdo automatiques (scheduling/état persistant).
- Gestion de l'horaire cyclique (4j/5j) et replanification de cours selon calendrier.
- Multi-agents / orchestrateur.

---

## 8. Définition de « terminé » pour la V1 démo

- [ ] L'enseignant se connecte et atterrit sur l'agent conversationnel.
- [ ] Les 3 actions rapides sont visibles et amorcent une conversation cadrée.
- [ ] Action A : à partir d'infos élève collées/saisies, l'agent génère un PAT structuré valide (Zod), en streaming, avec reformulation bienveillante.
- [ ] Le PAT généré est exportable (DOCX/PDF) sans mise en forme cassée.
- [ ] Aucune fuite de données entre comptes (RLS testée).
- [ ] L'usage décompte correctement du quota freemium.
- [ ] Mock traversant toute la chaîne AVANT branchement IA réel.