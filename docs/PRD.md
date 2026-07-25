# PRD — Module 1 : Correction IA (V1, texte numérique, français/langues)

## Problème

L'enseignant consacre plusieurs heures non rémunérées à corriger des copies après ses journées de classe. Maintenir une qualité et une cohérence de commentaires sur une trentaine de copies, tout en gardant une trace de qui maîtrise quoi, est épuisant et difficile à tenir dans la durée, semaine après semaine. Formuler systématiquement les difficultés sans jamais tomber dans une critique négative demande une vigilance constante que la fatigue érode.

## Solution

L'enseignant choisit une classe, apporte la copie de chaque élève (collée ou importée), et reçoit pour chacun une liste des points à travailler classés par catégorie ainsi qu'un commentaire personnalisé dans le ton qu'il a choisi — prêts à relire et valider en un clic. Sur l'ensemble de la classe, il voit d'un coup d'œil quelles catégories de difficultés reviennent le plus souvent, pour décider d'une révision collective. Les corrections qu'il valide telles quelles affinent discrètement le style des suggestions futures.

## Utilisateur cible

Enseignant de français/langues (rédaction, dissertation) au primaire ou au secondaire, ayant déjà configuré son profil (matière, niveau, pays) et créé sa classe avec ses élèves dans l'app. Il vient de faire passer une évaluation écrite et dispose des copies sous forme numérique (fichier texte/PDF ou texte copié depuis un traitement de texte).

## User Stories

1. En tant qu'enseignant, je veux sélectionner une classe existante, afin de préparer un lot de correction pour tous ses élèves.
2. En tant qu'enseignant sans classe créée, je veux être invité à en créer une avant de pouvoir importer des copies, afin de comprendre pourquoi le formulaire est vide.
3. En tant qu'enseignant, je veux voir la liste des élèves de la classe avec, pour chacun, une zone pour coller ou importer sa copie, afin d'apporter les copies une par une sans quitter la vue d'ensemble.
4. En tant qu'enseignant, je veux que le texte d'un fichier importé s'affiche et reste modifiable avant correction, afin de corriger une extraction imparfaite.
5. En tant qu'enseignant, je veux pouvoir laisser certains élèves sans copie renseignée, afin de lancer la correction seulement sur les copies disponibles.
6. En tant qu'enseignant qui importe un fichier scanné/image, je veux un message clair m'indiquant que seul le texte numérique est supporté, afin de ne pas perdre de temps à deviner pourquoi ça échoue.
7. En tant qu'enseignant, je veux choisir le ton du commentaire (encourageant, factuel, direct) pour tout le lot, afin que tous les commentaires soient cohérents entre eux.
8. En tant qu'enseignant, je veux lancer la correction de tout le lot en une seule action, afin de ne pas démarrer chaque copie individuellement.
9. En tant qu'enseignant, je veux voir la progression de la correction du lot, afin de savoir combien de temps il me reste à attendre.
10. En tant qu'enseignant, je veux consulter, pour chaque copie, les erreurs détectées classées par type et le commentaire généré, afin de vérifier ce que l'IA a produit.
11. En tant qu'enseignant, je veux pouvoir modifier le commentaire ou retirer une erreur mal détectée avant validation, afin de garder le contrôle final.
12. En tant qu'enseignant, je veux valider une copie en un clic, afin qu'elle devienne définitive et alimente la mémoire de calibrage.
13. En tant qu'enseignant, je veux passer d'une copie validée à la suivante sans étape intermédiaire, afin d'enchaîner la relecture de toute la classe rapidement.
14. En tant qu'enseignant dont une correction a échoué techniquement, je veux un message clair et la possibilité de relancer uniquement cette copie, afin de ne pas perdre le travail déjà validé sur les autres.
15. En tant qu'enseignant, je veux un tableau récapitulatif de classe montrant, par catégorie d'erreur, combien d'élèves sont concernés, afin de décider d'une révision collective.
16. En tant qu'enseignant, je veux que ce tableau se mette à jour au fur et à mesure de mes validations, afin d'avoir une vue toujours actuelle.
17. En tant qu'enseignant, je veux retrouver l'historique des copies validées par élève, afin de suivre son évolution dans le temps.
18. En tant qu'enseignant qui modifie un commentaire avant validation, je veux que ce soit cette version modifiée qui serve d'exemple de calibrage futur, afin que l'outil apprenne mes vraies préférences.
19. En tant qu'enseignant ayant atteint sa limite de générations gratuites du mois, je veux un message clair m'invitant à passer au plan payant, afin de comprendre pourquoi la correction ne démarre pas.
20. En tant qu'enseignant, je veux que le commentaire généré ne contienne jamais de formulation négative directe, afin de rester dans le ton attendu même si je valide rapidement.

## Critères de succès

- Une classe d'environ 30 copies est corrigée (commentaire + erreurs classées, prêtes à valider) en moins de temps qu'il n'en faut à l'enseignant pour en corriger 3 à la main.
- Une copie corrigée se valide en 3 clics ou moins.
- Le tableau récapitulatif de classe est visible et à jour dès qu'une copie de la classe est validée.
- Un fichier scanné/image est rejeté avec un message explicite, jamais ignoré silencieusement ou mal interprété.

## Hors périmètre

- OCR / copies manuscrites photographiées (texte numérique uniquement pour cette V1).
- Matières hors langues/rédaction (maths, sciences... après validation du calibrage).
- Remplissage automatique des grilles de compétences officielles (contenu référentiel non fourni par le client à ce stade).
- Alignement sur le programme ministériel officiel (dépend du Module 4, non construit).
- Validation groupée / « tout approuver d'un coup ».
- Envoi ou diffusion automatique du commentaire à un parent ou à l'administration.
- Détection de plagiat.
- Attribution automatique d'une note chiffrée finale — l'enseignant reste seul décideur de la note.

## Décisions d'implémentation

- Import : sélection d'une classe existante, puis pour chaque élève, saisie collée ou import de fichier (texte/PDF texte) — mêmes règles que l'upload de document source existant.
- Élèves sans copie renseignée sont simplement ignorés au lancement, pas bloquants.
- Ton du commentaire choisi une fois pour tout le lot, pas par copie individuelle.
- Sortie par copie : erreurs classées par type + commentaire de synthèse, tous deux modifiables avant validation.
- Validation strictement copie par copie.
- Catégories du tableau récapitulatif = mêmes catégories fixes que la détection d'erreurs, pas de définition libre par évaluation.
- Mémoire de calibrage alimentée automatiquement à la validation ; la version modifiée prime sur la proposition initiale.
- Fichier scanné/image détecté à l'import → message explicite, import refusé.
- Limite freemium du plan gratuit s'applique comme aux autres générations IA.

## Notes complémentaires

- Apport client majeur : exemples réels de commentaires pour calibrer le ton, avant mise en production.
- Risque d'adoption : ce module reste peu utile pour les classes où la majorité des copies existent uniquement sur papier tant que l'OCR (fonctionnalité séparée) n'est pas livré et validé. Recommandation : tester l'OCR sur 5-10 copies réelles peu après cette V1.
- Hypothèse : le profil enseignant déjà capturé à l'onboarding suffit à calibrer les générations sans configuration supplémentaire.
