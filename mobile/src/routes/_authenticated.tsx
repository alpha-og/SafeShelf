import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useNearestStore } from '@/features/stores/hooks/useNearestStore'
import { useAuth } from '@/hooks/useAuth'
import { useStore } from '@/providers/StoreProvider'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/welcome' })
    }
    // Signed in but no profile yet — send straight into onboarding so a profile
    // is created before anything else can be used.
    if (!context.profiles.hasProfile) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const auth = useAuth()
  const { selectedStoreId, isInitialized, setSelectedStoreId } = useStore()
  const navigate = useNavigate()
  const currentPath = useRouterState({ select: (s) => s.location.pathname })

  const { locateAndFetch, isLoading: isLocating } = useNearestStore()
  const [hasAttemptedAutoSelect, setHasAttemptedAutoSelect] = useState(false)

  useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate({ to: '/welcome' })
      return
    }

    if (isInitialized && !selectedStoreId && currentPath !== '/stores') {
      if (!hasAttemptedAutoSelect && !isLocating) {
        setHasAttemptedAutoSelect(true)
        locateAndFetch().then(({ stores }) => {
          const nearest = stores.length > 0 ? stores[0] : null
          if (nearest) {
            setSelectedStoreId(nearest.id)
          } else {
            navigate({ to: '/stores' })
          }
        })
      }
    }
  }, [
    auth.isAuthenticated,
    isInitialized,
    selectedStoreId,
    currentPath,
    navigate,
    hasAttemptedAutoSelect,
    isLocating,
    locateAndFetch,
    setSelectedStoreId,
  ])

  if (!auth.isAuthenticated || !isInitialized) return null

  if (isLocating && !selectedStoreId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground animate-pulse text-lg">Locating nearest SafeShelf...</p>
      </div>
    )
  }

  if (!selectedStoreId && currentPath !== '/stores') return null
  return <Outlet />
}
