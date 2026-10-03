import { z } from 'zod'

// Sortie demandee au modele : un resume structure, fidele aux notes fournies
// par l'enseignant — jamais une invention au-dela de ce que les notes
// contiennent (contrairement aux courriels parents, il n'y a ici aucune
// donnee de la base a verifier : les notes de l'enseignant sont la seule
// source de verite).
export const meetingSummaryDraftSchema = z.object({
  subjectsDiscussed: z.array(z.string().trim().min(1)).min(1).max(10),
  agreementsReached: z.array(z.string().trim().min(1)).max(10),
  nextSteps: z.array(z.string().trim().min(1)).max(10),
})

export type MeetingSummaryDraft = z.infer<typeof meetingSummaryDraftSchema>
