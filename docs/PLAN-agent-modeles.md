# Plan : Modèles de documents configurables (Agent IA) — PAT puis Bulletin

> PRD source : `docs/PRD-agent-modeles.md`
> Portée : Phases 1-2 = PAT via modèle de classe obligatoire (livré). Phase 3 = même principe appliqué à la génération de bulletin via l'agent.

## Décisions architecturales

- **Schema** : une colonne `document_template` (text, nullable) sur la table `classes` existante. Pas de nouvelle table — un seul modèle actif par classe (relation 1:1).
- **Circulation de la donnée** : le modèle voyage par le pipeline `getStudentContext` déjà en place (`class_students` → `classes`) et apparaît sur chaque classe de `StudentContext.classes[]`. Aucune requête réseau supplémentaire.
- **Nouveau type de réponse structurée** : `kind: 'template_missing'` dans `agentStructuredResponseSchema`, à côté de `clarification` / `student_not_found` / `pat`.
- **Forme de sortie du PAT** : inchangée (le schéma structuré actuel reste générique — forces/besoins, comportements ciblés, modalités d'appui, adaptations ; les deux champs propres au Québec restent optionnels). Le modèle texte libre de l'enseignant est injecté dans le prompt de génération comme référence de style/vocabulaire/structure attendue, sans changer le schéma de sortie ni l'export DOCX existant.
- **Résolution du modèle quand l'élève a plusieurs classes** : on retient la première classe (par ordre alphabétique, ordre déjà garanti par la requête existante) qui a un modèle configuré. Si aucune de ses classes n'en a, blocage.

---

## Phase 1 : Configuration du modèle de document par classe

**User stories** : PRD US-1, US-2, US-4, US-5, US-8

### Ce qu'on livre

Dans la fiche de classe (création et édition), l'enseignant ajoute, modifie ou supprime un texte de modèle. Le champ est visible dans le formulaire, persisté en base, et son état (configuré ou non) est visible sur la carte de la classe dans la liste. Cette phase est indépendante de l'agent : rien n'est encore consommé côté génération.

### Critères d'acceptation

- [ ] Un enseignant peut coller/rédiger un texte de modèle en créant une classe.
- [ ] Un enseignant peut ajouter, modifier ou vider le modèle d'une classe existante.
- [ ] Le modèle persiste après rechargement de la page.
- [ ] La carte de classe indique visuellement si un modèle est configuré ou non.
- [ ] Aucune régression sur la création/édition de classe existante (nom, niveau, matière).

## Bloquée par

Aucune — démarrable immédiatement.

---

## Phase 2 : Génération de PAT obligatoirement basée sur le modèle

**User stories** : PRD US-3, US-6, US-7, US-9

### Ce qu'on livre

Quand l'enseignant demande à l'agent de générer un PAT pour un élève : si aucune des classes de cet élève n'a de modèle configuré, l'agent répond clairement qu'aucun modèle n'est configuré et invite à en ajouter un — sans lancer de génération ni débiter le quota. Si un modèle existe, le PAT généré s'en inspire (style, vocabulaire, structure), passe par les mêmes garde-fous anti-hallucination et la même carte de relecture qu'aujourd'hui avant d'être considéré définitif.

### Critères d'acceptation

- [ ] Demande de PAT pour un élève dont aucune classe n'a de modèle → message de blocage clair, aucun appel IA, quota non débité.
- [ ] Demande de PAT pour un élève dont une classe a un modèle → génération inspirée du modèle, carte de relecture affichée comme aujourd'hui.
- [ ] Élève appartenant à plusieurs classes, une seule avec un modèle → ce modèle est utilisé, sans ambiguïté demandée à l'enseignant.
- [ ] L'export DOCX du PAT généré continue de fonctionner sans changement.
- [ ] Les parcours PAT existants (ambiguïté, élève inconnu, échec technique remboursé) restent inchangés.

## Bloquée par

- Phase 1 (le modèle doit pouvoir être configuré pour être testé).

---

---

## Phase 3 : Génération de bulletin via l'agent, modèle obligatoire

**User stories** : PRD US-3, US-6, US-7, US-9 (appliquées au bulletin)

### Décision architecturale propre à cette phase

Contrairement au PAT, un bulletin a besoin d'informations que l'app ne suit nulle part (matière, note/appréciation) : l'enseignant doit les donner lui-même dans son message à l'agent. L'extraction de ces champs depuis un message libre se fait par une petite génération IA structurée (même logique que la génération PAT elle-même), pas par des règles textuelles — un enseignant qui écrit dans le désordre, oublie un mot-clé ou change de langue doit quand même être compris. Un filtre par mots-clés (léger, sans appel IA) décide d'abord si le message ressemble à une demande de bulletin, pour éviter de déclencher cette extraction sur chaque message du chat.

Si l'extraction ne trouve pas la matière ou la note, la conversation continue normalement (pas de blocage technique) : l'agent, dans le fil de discussion, demande lui-même l'information manquante — cohérent avec la règle anti-hallucination déjà en place.

Le canal classique (formulaire `/bulletin`) n'est ni modifié ni recâblé : le paramètre modèle est ajouté en option à la génération existante, ignoré si absent, pour que ce chemin reste identique à aujourd'hui.

### Ce qu'on livre

L'enseignant écrit à l'agent une demande de commentaire de bulletin (l'action rapide déjà présente dans le chat guide le format). Si aucune des classes de l'élève n'a de modèle configuré, l'agent bloque avec le même message que pour le PAT. Si un modèle existe, le commentaire généré s'en inspire, s'enregistre dans l'historique des bulletins existant (visible sur `/bulletin` comme les commentaires générés depuis le formulaire), et s'affiche dans le chat pour relecture avant usage.

### Critères d'acceptation

- [ ] Demande de bulletin avec matière/note/élève reconnaissables, mais aucune classe de l'élève n'a de modèle → message de blocage clair, aucun appel IA de génération, quota non débité.
- [ ] Demande de bulletin complète pour un élève dont une classe a un modèle → commentaire généré inspiré du modèle, affiché pour relecture, retrouvable ensuite dans l'historique des bulletins.
- [ ] Demande de bulletin incomplète (matière ou note absente du message) → l'agent la redemande dans la conversation, sans erreur technique.
- [ ] Un message qui ne ressemble pas à une demande de bulletin ne déclenche aucune extraction ni aucun appel IA supplémentaire.
- [ ] Le formulaire classique de bulletin (`/bulletin`) continue de fonctionner exactement comme avant, sans modèle requis.

## Bloquée par

- Phase 1 (modèle de classe) et Phase 2 (gabarit d'orchestration/blocage repris du PAT).

---

---

## Phase 4 : Modèle fourni en PDF, lu directement par l'agent

### Décision

Le champ texte (Phase 1) reste disponible. En plus, l'enseignant peut téléverser le PDF de son gabarit institutionnel existant plutôt que de le retaper. Si un PDF est présent pour la classe, il est prioritaire sur le texte collé. Le PDF est transmis tel quel au modèle IA (lecture native de document), pas d'extraction de texte intermédiaire — le stockage du fichier se fait via Supabase Storage (déjà dans la stack du projet), aucune nouvelle dépendance requise.

### Ce qu'on livre

Dans la fiche de classe, l'enseignant peut téléverser un PDF (une fois la classe créée). Le PDF remplace visuellement le texte comme source du modèle pour cette classe. La génération de PAT et de bulletin via l'agent utilise ce PDF comme référence quand il est présent.

### Critères d'acceptation

- [ ] Téléversement d'un PDF sur une classe existante → persiste, visible au rechargement.
- [ ] Un PDF présent est utilisé en priorité sur le texte collé pour la même classe.
- [ ] Suppression du PDF → l'agent retombe sur le texte collé s'il existe, sinon sur le blocage habituel.
- [ ] Fichier non-PDF ou trop volumineux → rejeté avec un message clair, rien n'est enregistré.
- [ ] Chaque enseignant n'a accès qu'à ses propres fichiers (isolation par utilisateur au niveau du stockage).

## Bloquée par

- Phase 1 (le texte reste le mécanisme de repli) et Phase 2/3 (le point de branchement dans l'orchestration).

---

## Notes

- Bulletin via l'agent (Phase 3) réutilise volontairement l'infrastructure PAT (`selectDocumentTemplate`, type de réponse `template_missing`, bucket de quota agent) plutôt que d'en recréer une parallèle.
- Phase 4 réutilise le même point de branchement (`selectDocumentTemplate`) pour les deux types de documents (PAT et bulletin).
