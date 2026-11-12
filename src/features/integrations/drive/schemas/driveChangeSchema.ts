import { z } from 'zod'
import { DRIVE_MAX_WRITE_CHARS, driveFileIdSchema } from './driveImportSchema.ts'

// Modification proposée par l'agent. Elle n'est JAMAIS exécutée directement :
// elle est affichée à l'enseignant (carte « Confirmer »), puis appliquée par la
// route de confirmation, qui revalide cette même structure.
export const driveChangeSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('update_doc'),
      fileId: driveFileIdSchema,
      text: z.string().min(1).max(DRIVE_MAX_WRITE_CHARS),
    })
    .strict(),
  z
    .object({
      type: z.literal('create_doc'),
      name: z.string().trim().min(1).max(200),
      text: z.string().min(1).max(DRIVE_MAX_WRITE_CHARS),
    })
    .strict(),
])

export type DriveChange = z.infer<typeof driveChangeSchema>

export const driveSearchInputSchema = z.object({
  query: z.string().trim().max(200).optional(),
  limit: z.number().int().min(1).max(25).optional(),
})

export const driveReadInputSchema = z.object({
  fileId: driveFileIdSchema,
})

export const driveProposeChangeInputSchema = z.object({
  change: driveChangeSchema,
})

export type DriveSearchInput = z.infer<typeof driveSearchInputSchema>
export type DriveReadInput = z.infer<typeof driveReadInputSchema>
