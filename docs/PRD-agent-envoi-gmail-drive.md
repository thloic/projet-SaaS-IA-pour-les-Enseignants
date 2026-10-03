# PRD — Envoi réel des courriels parents (Gmail) + import Drive

## Problème

Après qu'EducAssist génère un brouillon de courriel aux parents (et sa traduction), l'enseignant doit encore copier le texte, ouvrir sa propre messagerie, retrouver l'adresse du parent et envoyer lui-même — une rupture manuelle qui annule une partie du temps gagné par la génération automatique. De la même façon, quand l'enseignant veut que l'agent s'appuie sur un document qu'il a déjà (un gabarit institutionnel, une lettre type, un exercice de référence) mais que ce document vit dans son Google Drive plutôt que sur son ordinateur, il doit d'abord le télécharger puis le réimporter dans EducAssist avant de pouvoir l'utiliser — une étape de contournement répétée à chaque nouvelle ressource.

## Solution

L'enseignant connecte son compte Gmail une seule fois depuis la carte de courriel de l'agent (un simple « Se connecter avec Google »). Une fois un brouillon généré, il peut soit cliquer sur « Envoyer » sur la carte, soit simplement le demander dans la conversation (« envoie-le aux parents ») — si Gmail n'est pas encore connecté, l'agent le dit et invite à le connecter ; si l'adresse du parent n'est pas encore connue, l'agent la demande. Une fois l'adresse fournie et Gmail connecté, l'enseignant choisit la version à envoyer si plusieurs langues existent, relit le texte final, confirme — le courriel part depuis sa propre boîte Gmail. Il garde une trace de cet envoi dans son historique de communications.

Séparément, l'enseignant peut connecter son Google Drive. Pour une génération donnée, il peut demander à l'agent d'utiliser un document de son Drive ; l'agent déclenche alors le sélecteur natif Google pour qu'il choisisse le fichier précis (jamais un accès libre à tout son Drive), qui devient la source pour cette génération.

## Utilisateur cible

Enseignant déjà utilisateur de l'agent conversationnel EducAssist, qui a déjà généré au moins un brouillon de courriel aux parents, et qui possède un compte Gmail (personnel ou de son établissement) qu'il accepte de connecter à EducAssist pour que l'envoi parte visiblement de sa propre adresse — pas d'une adresse générique EducAssist. Pour le Drive, c'est ce même enseignant quand il a déjà un document utile (gabarit, lettre type, exercice) stocké dans son Google Drive plutôt que sur son poste.

## User Stories

1. En tant qu'enseignant, je veux connecter mon compte Gmail une seule fois, afin que mes envois futurs partent automatiquement de ma propre adresse.
2. En tant qu'enseignant avec un brouillon déjà généré, je veux cliquer sur « Envoyer » et indiquer l'adresse du parent, afin d'envoyer sans changer d'application.
3. En tant qu'enseignant qui n'a pas encore connecté Gmail et qui clique sur « Envoyer » ou le demande dans le chat, je veux être invité clairement à le connecter, afin de comprendre pourquoi l'envoi ne part pas.
4. En tant qu'enseignant qui a aussi généré une traduction du brouillon, je veux choisir quelle version envoyer (originale ou traduite), afin d'envoyer dans la langue du parent.
5. En tant qu'enseignant, je veux relire le texte final avant de confirmer l'envoi, afin de garder le contrôle sur ce qui part réellement.
6. En tant qu'enseignant qui vient d'envoyer un courriel, je veux voir une confirmation claire avec l'adresse utilisée, afin de savoir que c'est bien parti.
7. En tant qu'enseignant dont l'envoi échoue techniquement, je veux un message clair et la possibilité de réessayer, afin de ne pas perdre le brouillon déjà rédigé.
8. En tant qu'enseignant ayant atteint sa limite d'envois du mois, je veux un message clair, afin de comprendre pourquoi l'envoi ne part pas.
9. En tant qu'enseignant, je veux pouvoir connecter mon Google Drive séparément de Gmail, afin de n'accorder que les accès dont j'ai besoin.
10. En tant qu'enseignant qui veut que l'agent s'appuie sur un document de son Drive, je veux choisir ce document précis via la fenêtre native Google, afin de ne jamais donner un accès large à tout mon Drive.

## Critères de succès

- Un brouillon déjà généré part réellement par courriel après connexion Gmail + confirmation, sans que l'enseignant quitte EducAssist.
- Un enseignant non connecté qui tente d'envoyer voit une invitation claire à connecter Gmail, jamais une erreur technique brute.
- L'historique de communications affiche l'adresse et l'heure d'un envoi réussi.
- Un document choisi via le sélecteur Drive devient disponible comme source de génération sans passage par un téléchargement/réimport manuel.

## Hors périmètre

- Accusés de lecture / suivi d'ouverture du courriel envoyé (reporté, feature #27).
- Pièces jointes ou mise en forme HTML dans le courriel envoyé (texte brut uniquement).
- Accès libre à l'ensemble du Drive de l'enseignant (toujours un choix fichier par fichier via le sélecteur natif).
- Indexation ou mise en cache du contenu Drive côté serveur.
- Envoi groupé (à plusieurs parents en une fois).
- Réception de réponses des parents dans EducAssist (communication à sens unique pour cette version).

## Décisions d'implémentation

- L'envoi part toujours de la boîte Gmail personnelle de l'enseignant (jamais d'une adresse générique EducAssist).
- Connexion Gmail et connexion Drive sont deux autorisations séparées, demandées indépendamment ; accorder l'une n'accorde pas l'autre.
- L'enseignant doit explicitement confirmer l'envoi (adresse du parent + relecture finale) : aucun envoi n'est jamais déclenché automatiquement par l'agent seul.
- Si une traduction existe pour le brouillon, l'enseignant choisit explicitement quelle version part (jamais un choix automatique).
- Le sélecteur de fichier Drive est toujours la fenêtre native Google (l'enseignant choisit lui-même le fichier précis), jamais une liste parcourue librement par l'agent.
- Limite mensuelle d'envois distincte de la limite de génération IA (envoyer n'est pas une génération).
- Les brouillons déjà envoyés restent visibles et modifiables, mais affichent clairement qu'ils ont déjà été envoyés et à quelle adresse.

## Notes complémentaires

- **État au 2026-10-03** : l'envoi Gmail (connexion, envoi, historique, quota, invitation à connecter) est construit et testé (tests unitaires + intégration, mode simulé sans appel réseau réel). L'import Drive (connexion, sélecteur, utilisation comme source de génération) reste à construire — prochaine étape de ce PRD.
- **Prérequis externe bloquant pour un envoi réel** (hors code) : un projet Google Cloud avec l'API Gmail activée, un écran de consentement OAuth avec le scope d'envoi, et des identifiants Client ID/Secret. En mode Test Google (jusqu'à 100 comptes), aucune vérification n'est requise ; pour ouvrir à tous les enseignants, une vérification Google (sensible, sans évaluation de sécurité lourde) est nécessaire.
- Risque : si l'enseignant révoque l'accès côté Google après connexion, le prochain envoi doit échouer proprement avec une invitation à reconnecter, jamais un plantage.
- Hypothèse : un enseignant est prêt à connecter son compte Google personnel/professionnel à un outil tiers pour ce gain de temps — à valider avec les premiers retours utilisateurs.
