import type { PAT } from '../schemas/patSchema.ts'

export const patMock = {
  eleve: {
    nom: 'Maélis',
    niveau: '8e année',
    profil: 'Apprenante de la langue française / nouvelle arrivante',
  },
  habiletes: {
    forces: [
      'Démontre une grande curiosité et s’engage volontiers dans les activités pratiques.',
      'Collabore avec respect et sollicite de l’aide de façon appropriée.',
      'Mobilise efficacement les supports visuels pour communiquer ses idées.',
    ],
    besoins: [
      'Développer un vocabulaire scolaire plus précis en français.',
      'Consolider les stratégies de compréhension lors de la lecture de textes informatifs.',
      'Gagner en autonomie dans la planification et la révision des productions écrites.',
    ],
  },
  comportementsCibles: [
    {
      date: '2026-09-15',
      habilete: 'Reformuler une consigne avec ses propres mots avant de commencer une tâche.',
      interventionsPrevues:
        'Modéliser la reformulation, fournir un aide-mémoire visuel et vérifier la compréhension en entretien bref.',
      preuvesProgression:
        'Reformulation autonome et juste de la consigne dans quatre situations sur cinq.',
    },
    {
      date: '2026-10-06',
      habilete: 'Planifier un court texte à l’aide d’un organisateur graphique.',
      interventionsPrevues:
        'Présenter un modèle annoté, construire un exemple en petit groupe et offrir une rétroaction descriptive.',
      preuvesProgression:
        'Organisateur complété avec une idée principale et au moins deux détails pertinents.',
    },
  ],
  modalitesAppui: [
    'Enseignement explicite en petit groupe deux fois par semaine.',
    'Appui individuel bref au démarrage des tâches complexes.',
    'Échanges réguliers avec la personne responsable de la francisation.',
  ],
  adaptationsOffertes: [
    'Temps supplémentaire pour les tâches de lecture et d’écriture.',
    'Reformulation des consignes et vérification de la compréhension.',
    'Accès à un lexique illustré et à un outil de synthèse vocale.',
    'Utilisation d’organisateurs graphiques.',
  ],
  recommandationsPSAC:
    'Maintenir les appuis ciblés pendant huit semaines, documenter les progrès toutes les deux semaines et réviser les modalités avec l’équipe-école à la fin de la période.',
  francisation: {
    communicationOrale:
      'Participe avec assurance aux échanges familiers et développe progressivement le vocabulaire disciplinaire.',
    lecture:
      'Repère les informations explicites et s’appuie efficacement sur les indices visuels et contextuels.',
    ecriture:
      'Communique des idées pertinentes et développe l’organisation de textes courts en plusieurs phrases.',
    besoins: [
      'Élargir le vocabulaire propre aux différentes matières scolaires.',
      'Consolider l’emploi des marqueurs de relation dans les productions écrites.',
    ],
  },
} satisfies PAT
