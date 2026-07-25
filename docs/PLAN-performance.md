# Plan : Réactivité de l'interface (latence perçue sur chaque clic)

> PRD source : docs/PRD-performance.md

## Décisions architecturales

- **Routes** : aucune nouvelle route — corrections transverses sur le middleware et des pages existantes.
- **Schema** : aucun changement de base de données.
- **Auth** : la validation de session à chaque requête (sécurité) reste inchangée ; seule la vérification « profil complété » passe d'« à chaque navigation » à « une fois par connexion ».
- **Frontières tiers** : Supabase Auth + Postgres, inchangées — objectif : moins d'appels réseau, pas de nouveau service.

---

## Phase 1 : Éliminer la revérification du profil enseignant à chaque navigation

**User stories** : 5 (contribue directement à 1 et 2 — c'est la cause principale identifiée)

### Ce qu'on livre

Le statut « profil complété » n'est plus requêté en base à chaque page visitée une fois la session ouverte — seule la connexion (et la complétion de l'onboarding) le revérifie. Un enseignant avec un profil incomplet est toujours redirigé vers l'onboarding ; une fois complété, plus aucune navigation ultérieure ne repasse par cette vérification pendant la même session.

### Critères d'acceptation

- [ ] Naviguer entre plusieurs pages protégées après connexion ne déclenche plus de requête `teacher_profiles` à chaque navigation.
- [ ] Un enseignant dont le profil est incomplet est toujours redirigé vers l'onboarding à la connexion.
- [ ] Après avoir complété l'onboarding, l'enseignant accède directement aux pages protégées sans redirection ni vérification supplémentaire pour le reste de la session.

## Bloquée par

Aucune — démarrable immédiatement.

---

## Phase 2 : Restaurer la mise en cache sur les pages qui n'ont pas besoin d'être toujours régénérées

**User stories** : 2

### Ce qu'on livre

**Constat après investigation (aucun changement de code nécessaire)** : la prémisse de cette phase ne tient pas pour ce projet. Le client Supabase serveur lit les cookies de session à chaque appel — c'est une API dynamique de Next.js qui force déjà le rendu dynamique de toutes ces pages, indépendamment du flag explicite `force-dynamic`. Retirer ce flag n'aurait donc aucun effet mesurable sur la latence : les pages resteraient rendues dynamiquement de toute façon, à cause de l'authentification elle-même. Le garder est correct et sans risque de contenu périmé.

### Critères d'acceptation

- [x] Vérifié que retirer `force-dynamic` ne changerait pas le comportement de rendu (lecture de cookies déjà dynamique) — aucune régression possible, mais aucun gain non plus : phase classée sans action.

## Bloquée par

Aucune — indépendante de la Phase 1.

---

## Phase 3 : Supprimer le délai visible à la sélection d'une classe (bulletin et correction)

**User stories** : 4

### Ce qu'on livre

La liste des élèves apparaît sans délai perceptible après sélection d'une classe, dans le formulaire de commentaires de bulletin et dans le formulaire d'import par lot de la Correction IA, y compris en cas de changement rapide de classe.

### Critères d'acceptation

- [ ] Sélectionner une classe dans le formulaire de bulletin affiche la liste des élèves en moins de 200ms perçus.
- [ ] Même comportement dans le formulaire de correction par lot.
- [ ] Changer plusieurs fois de classe rapidement n'affiche jamais la liste d'élèves d'une classe précédente.

## Bloquée par

Aucune.

---

## Phase 4 : Indicateur de chargement systématique sur toute navigation

**User stories** : 3

### Ce qu'on livre

Un signal de chargement clair apparaît dès qu'une navigation entre deux pages dépasse une seconde — aujourd'hui, cliquer sur un lien de navigation ne montre aucun signal tant que la page suivante n'est pas prête, ce qui est une source directe du ressenti « je clique et rien ne se passe ».

### Critères d'acceptation

- [ ] Cliquer sur un lien de navigation affiche un signal de chargement si la page met plus d'une seconde à s'afficher.
- [ ] Aucune navigation de plus d'une seconde ne reste sans indicateur visuel, sur l'ensemble des pages testées.

## Bloquée par

Aucune — filet de sécurité, à faire logiquement en dernier une fois les autres phases en place.
