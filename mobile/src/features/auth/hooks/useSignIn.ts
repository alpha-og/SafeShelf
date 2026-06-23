import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { api, setAccessToken } from '@/lib/axios'
import type { SignInInput } from '../schemas/auth'
import { authApi } from '../services/auth'

export function useSignIn() {
  const auth = useAuth()
  return useMutation({
    mutationFn: (data: SignInInput) => authApi.signIn(data),
    onSuccess: async (response) => {
      const { access_token } = response.data
      setAccessToken(access_token)
      const { data: user } = await api.get<{ id: number; email: string; created_at: string }>(
        '/v1/auth/me',
      )
      auth.restoreSession(access_token, user)
    },
  })
}
