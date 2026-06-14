import { useQuery } from '@tanstack/react-query'
import { readUserProfile } from '../services/userProfile'

export function useUserProfile() {
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: readUserProfile,
  })
}
