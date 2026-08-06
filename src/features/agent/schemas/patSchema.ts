import { z } from 'zod'

export const PATSchema = z
  .object({
    eleve: z
      .object({
        nom: z.string(),
        niveau: z.string().optional(),
        profil: z.string().optional(),
      })
      .strict(),
    habiletes: z
      .object({
        forces: z.array(z.string()),
        besoins: z.array(z.string()),
      })
      .strict(),
    comportementsCibles: z.array(
      z
        .object({
          date: z.string().optional(),
          habilete: z.string(),
          interventionsPrevues: z.string(),
          preuvesProgression: z.string().optional(),
        })
        .strict()
    ),
    modalitesAppui: z.array(z.string()),
    adaptationsOffertes: z.array(z.string()),
    recommandationsPSAC: z.string().optional(),
    francisation: z
      .object({
        communicationOrale: z.string().optional(),
        lecture: z.string().optional(),
        ecriture: z.string().optional(),
        besoins: z.array(z.string()).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export type PAT = z.infer<typeof PATSchema>
