import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '../services/auth'

export function useSignOut() {
  const auth = useAuth()
  return useMutation({
    mutationFn: () => authApi.signOut(),
    onSettled: () => {
      auth.signOut()
    },
  })
}
