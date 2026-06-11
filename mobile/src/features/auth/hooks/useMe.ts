import { useQuery } from '@tanstack/react-query'
import { authApi } from '../services/auth'

export function useMe(enabled: boolean) {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me().then((r) => r.data),
    enabled,
    retry: false,
    staleTime: 60_000,
  })
}
