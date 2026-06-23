import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiError } from '@/lib/logger'
import { type ConstraintKind, searchConstraints } from '../services/constraints'

export function useConstraintSearch(kind: ConstraintKind, query: string, enabled: boolean) {
  return useQuery({
    queryKey: ['constraints', kind, query],
    queryFn: async () => {
      try {
        return await searchConstraints(kind, query)
      } catch (err) {
        apiError('searchConstraints', err)
        toast.error('Failed to search. The backend may be unavailable.')
        throw err
      }
    },
    // Never hit the API until the user has actually typed something — we don't
    // want to dump the entire catalogue before any search.
    enabled: enabled && query.trim().length > 0,
    staleTime: 60_000,
  })
}
