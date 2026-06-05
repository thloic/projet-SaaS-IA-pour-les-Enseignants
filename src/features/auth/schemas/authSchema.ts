import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum'),
})

export const registerSchema = z
  .object({
    email: z.string().email('Email invalide'),
    password: z.string().min(8, 'Mot de passe : 8 caractères minimum'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
