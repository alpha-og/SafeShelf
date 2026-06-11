import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '../services/auth'
import type { SignInInput } from '../schemas/auth'

export function useSignIn() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (data: SignInInput) => authApi.signIn(data),
    onSuccess: async (_data, variables) => {
      await auth.signIn(variables.email, variables.password)
    },
  })
}
