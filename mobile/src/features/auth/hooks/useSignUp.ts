import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import type { SignUpInput } from '../schemas/auth'
import { authApi } from '../services/auth'

export function useSignUp() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (data: SignUpInput) => authApi.signUp(data),
    onSuccess: (response) => {
      const { access_token, id, email, created_at } = response.data
      auth.restoreSession(access_token, { id, email, created_at })
    },
  })
}
