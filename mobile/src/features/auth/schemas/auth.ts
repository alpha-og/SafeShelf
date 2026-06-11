import { z } from 'zod'

export const signUpSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const signInSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type SignUpInput = z.output<typeof signUpSchema>
export type SignInInput = z.output<typeof signInSchema>
