import { z } from 'zod'

export const documentSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est requis').max(200, 'Titre trop long'),
  contentText: z
    .string()
    .trim()
    .min(1, 'Le contenu est requis')
    .max(20000, 'Le contenu est limité à 20 000 caractères pour l\'instant'),
  sourceType: z.enum(['text', 'file']),
  originalFilename: z.string().trim().max(255).optional(),
  fileType: z.enum(['txt', 'pdf', 'docx']).optional(),
})

export type DocumentInput = z.infer<typeof documentSchema>
