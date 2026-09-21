# PRD — Agent IA : cadrage du retour client (différenciation vs. assistant générique)

## Problème

L'enseignant qui utilise l'agent conversationnel d'EducAssist obtient déjà des réponses contextualisées à son profil et à sa classe, mais l'assistant reste pour l'instant un outil qu'il faut solliciter à chaque étape : il ne connecte pas encore les résultats et observations déjà enregistrés dans EducAssist à une analyse de groupe exploitable, ne prépare pas de brouillon de plan de suivi à partir des observations déjà accumulées sur un élève, et n'anticipe rien avant que l'enseignant ne le lui demande explicitement. Face à un abonnement IA générique à bas coût qui fait déjà de la génération de texte à la demande, l'enseignant ne voit pas toujours ce qui, dans l'agent EducAssist, justifie un abonnement dédié : la valeur doit venir de ce que l'assistant sait déjà sur sa classe et ses élèves, pas de sa seule capacité à produire du texte sur demande.

## Solution

L'agent EducAssist devient l'endroit où l'enseignant retrouve, sans les redemander, des analyses qui exploitent ce qu'il a déjà saisi dans son compte : un diagnostic des erreurs les plus fréquentes de sa classe après une correction, avec une piste de reprise concrète ; un brouillon de plan de suivi construit à partir des observations déjà consignées sur un élève ; des commentaires de bulletin qui s'appuient sur les traces réelles de l'année plutôt que sur ce que l'enseignant retape à chaque fois. L'enseignant peut aussi fournir sa propre grille de correction plutôt que de dépendre d'une grille générique. Chacune de ces propositions reste un brouillon que l'enseignant relit, modifie et valide avant qu'elle ne devienne définitive ou ne parte vers un parent — jamais une action prise seule par l'agent. Quand une demande dépend d'un contenu que l'enseignant n'a pas encore fourni à EducAssist (référentiel de compétences officiel, calendrier scolaire de son établissement), l'agent le signale clairement plutôt que de produire un résultat approximatif.

## Utilisateur cible

Enseignant déjà utilisateur de l'agent conversationnel EducAssist, avec au moins une classe créée, des élèves rattachés, et un usage établi d'au moins une fonction existante (correction, bulletin, messages, plan d'appui). C'est aussi la personne qui décide du renouvellement de son abonnement et qui compare, même implicitement, l'agent à un assistant IA généraliste : elle veut y retrouver ce qu'aucun assistant généraliste ne peut lui offrir, faute d'accès aux données réelles de sa classe.

## User Stories

1. En tant qu'enseignant qui vient de faire corriger une évaluation par l'agent, je veux qu'il m'indique les erreurs les plus fréquentes de ma classe sur cette évaluation avec une piste de reprise concrète, afin de décider en un coup d'œil si une révision collective s'impose.
2. En tant qu'enseignant, je veux demander à l'agent un brouillon de plan de suivi pour un élève à partir des observations déjà consignées sur lui, afin de ne pas repartir d'une page blanche à chaque échéance.
3. En tant qu'enseignant, je veux que l'agent me propose un commentaire de bulletin qui s'appuie sur les résultats et observations réels de l'élève durant l'année, afin de ne pas ressaisir ce que je sais déjà de lui.
4. En tant qu'enseignant, je veux fournir moi-même ma grille de correction à l'agent plutôt qu'il applique une grille générique, afin que sa pré-correction reflète vraiment mes critères.
5. En tant qu'enseignant, je veux que toute proposition de l'agent basée sur mes données de classe reste une proposition à relire et valider avant de devenir définitive, afin de garder la responsabilité finale sur ce qui concerne mes élèves.
6. En tant qu'enseignant qui a déjà personnalisé le ton de ses commentaires ou de ses messages, je veux que l'agent réutilise ce ton dans ses nouvelles propositions sans que j'aie à le repréciser, afin de ne pas recommencer ce calibrage à chaque fonction.
7. En tant qu'enseignant, je veux que l'agent me signale clairement qu'il lui manque un référentiel de compétences officiel ou un calendrier scolaire avant de proposer un alignement curriculaire ou une planification annuelle, afin de comprendre que ce n'est pas encore disponible plutôt que de recevoir un résultat approximatif.
8. En tant qu'enseignant dont la classe n'a pas encore assez de résultats enregistrés pour dégager une tendance, je veux que l'agent me dise qu'il n'a pas assez de données plutôt que de risquer une fausse tendance, afin de ne pas prendre une décision sur une base fragile.
9. En tant qu'enseignant qui n'a jamais renseigné d'observations sur un élève, je veux que l'agent me dise qu'il manque d'observations pour proposer un brouillon de plan de suivi, afin de savoir quoi faire avant de pouvoir continuer.
10. En tant qu'enseignant, je veux avoir la certitude qu'aucune information sur mes élèves ne sert jamais à entraîner les modèles de l'agent, afin de faire confiance à l'outil avec des données sensibles.
11. En tant qu'enseignant, je veux qu'aucune note finale ne soit jamais attribuée par l'agent sans mon clic explicite, afin de rester seul décideur de l'évaluation de mes élèves.
12. En tant qu'enseignant, je veux qu'aucun message destiné à un parent ne parte sans que je l'aie relu et envoyé moi-même, afin de garder le contrôle sur ma communication avec les familles.

## Critères de succès

- Après une correction de classe déjà réalisée dans EducAssist, l'agent produit sans nouvelle sollicitation manuelle un classement des erreurs les plus fréquentes avec au moins une piste de reprise, pour toute classe ayant au moins un lot de copies validées.
- Un brouillon de plan de suivi généré pour un élève reprend au moins une observation ou adaptation déjà enregistrée sur cet élève dans EducAssist, vérifiable en le comparant à sa fiche.
- Un commentaire de bulletin proposé par l'agent référence au moins un résultat ou une observation réels de l'élève durant l'année en cours, pas uniquement une formulation générique.
- Une grille de correction fournie par l'enseignant est appliquée telle quelle par l'agent lors de la pré-correction suivante, vérifiable critère par critère.
- Une demande d'alignement curriculaire ou de planification annuelle reçoit un message explicite d'absence de référentiel ou de calendrier tant que le client ne l'a pas fourni, jamais un résultat inventé, et ne débite pas le quota de générations.
- Aucune note finale n'est enregistrée dans le dossier d'un élève sans un clic de validation explicite de l'enseignant, vérifiable dans l'historique de chaque note.
- Aucun message n'est envoyé à un parent sans passer par un état « brouillon » suivi d'une action d'envoi manuelle de l'enseignant.

## Hors périmètre

- Intégrations en lecture/écriture avec Google Classroom, Microsoft Teams for Education, Mozaïk-Portail, GPI, Pluriportail, ou tout autre système externe de l'école, y compris l'import du carnet de notes existant — reporté à la toute fin de la feuille de route produit.
- Conversion de matériel scanné (photo de manuel) ou audio/vidéo en exercices ou guide d'étude — nécessite une brique technique séparée non engagée à ce stade.
- Alertes envoyées à l'enseignant sans qu'il ait rien demandé (chute de rendement, absences répétées, breffage automatique du lundi) — nécessite une exécution planifiée qui n'existe pas dans l'agent aujourd'hui.
- Dictée vocale pour alimenter un journal d'observations — aucune saisie vocale n'existe encore dans le produit.
- Repérage de passages potentiellement générés par IA dans une copie d'élève — fonction non fiable techniquement à ce jour ; si elle est un jour engagée, ce sera un chantier séparé et prudent, jamais une accusation automatique.
- Calendrier pédagogique qui se réajuste automatiquement à un imprévu (tempête, journée pédagogique déplacée) — dépend d'abord d'un calendrier scolaire officiel non encore fourni par le client.
- Alignement automatique sur un programme ministériel détecté en temps réel — aucune source officielle structurée n'existe ; l'agent ne réagit qu'à un contenu curriculaire fourni et mis à jour manuellement par le client.
- Repérage automatique de tâches répétitives de l'enseignant pour proposer de les automatiser — nécessiterait une analyse de comportement d'usage non engagée.
- Attribution autonome d'une note finale par l'agent.
- Envoi autonome d'une communication à un parent.
- Entraînement des modèles de l'agent sur les données des élèves.

## Décisions d'implémentation

- L'analyse des erreurs fréquentes de classe et la proposition de commentaire de bulletin s'appuient uniquement sur les résultats et observations déjà présents dans le compte de l'enseignant ; rien n'est recherché ou importé automatiquement depuis l'extérieur.
- Un brouillon de plan de suivi affiche, à côté de chaque élément proposé, l'observation ou la donnée d'origine dont il s'inspire, afin que l'enseignant puisse vérifier la source avant de valider.
- Tant qu'une grille de correction personnelle n'a pas été fournie par l'enseignant pour une classe donnée, l'agent continue d'utiliser son comportement actuel (grille par défaut) sans bloquer la correction.
- Une demande touchant un référentiel de compétences ou un calendrier scolaire non fourni affiche un message identifiant précisément ce qui manque, sans compter dans le quota de générations de l'enseignant.
- Toute proposition générée par l'agent dans ce périmètre (analyse de groupe, plan de suivi, commentaire de bulletin) apparaît avec les mêmes actions de relecture, modification et validation que les documents déjà générés par l'agent aujourd'hui.

## Notes complémentaires

- Ce document part d'un retour du client comparant l'agent EducAssist à un assistant IA générique. La majorité des idées reçues rejoignent des fonctionnalités déjà prévues dans la feuille de route produit (différenciation, messages aux parents, traduction, correction, bulletin, alignement curriculaire, calendrier pédagogique) ou déjà cadrées séparément pour l'agent conversationnel (modèles de documents par classe, contexte de classe, expérience de conversation) : ce document ne les rouvre pas. Il ajoute deux angles qui n'étaient pas encore cadrés — l'analyse de groupe rendue exploitable sans nouvelle sollicitation, et le brouillon de plan de suivi construit à partir des observations déjà connues — et rappelle les garde-fous du produit dans ce nouveau contexte.
- Deux dépendances bloquent une partie du retour client indépendamment de tout développement : un référentiel de compétences officiel structuré et un calendrier scolaire de l'établissement. Ce sont des apports attendus du client, pas des données disponibles publiquement.
- Le retour client positionne les intégrations à des systèmes de l'école (Google Classroom, Teams, Mozaïk, carnet de notes existant) comme un minimum vital pour justifier le prix. La feuille de route produit les place au contraire en toute dernière étape, après que la valeur de l'agent ait été démontrée sur les données déjà présentes dans EducAssist. Ce document tranche en faveur de l'ordre existant : livrer d'abord les user stories ci-dessus, vérifier qu'elles suffisent à justifier l'abonnement, avant d'engager la complexité d'une intégration externe. Point à rouvrir avec le client si ce n'est toujours pas le cas une fois ces fonctions livrées.
- Les alertes proactives, le repérage de passages générés par IA et l'automatisation de tâches détectées ne correspondent à aucune fonctionnalité numérotée existante dans la feuille de route ; à qualifier et positionner seulement une fois les fonctions de ce document livrées et éprouvées.
- Risque : sans exemple réel de grille de correction, de plan de suivi ou de commentaire de bulletin fourni par le client, les critères de succès de ce document restent à valider sur des cas concrets dès que possible.
