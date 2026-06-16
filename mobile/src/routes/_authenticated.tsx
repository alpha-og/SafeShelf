import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useStore } from '@/providers/StoreProvider'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/signin' })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const auth = useAuth()
  const { selectedStoreId, isInitialized } = useStore()
  const navigate = useNavigate()
  const currentPath = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate({ to: '/signin' })
    } else if (isInitialized && !selectedStoreId && currentPath !== '/stores') {
      navigate({ to: '/stores' })
    }
  }, [auth.isAuthenticated, isInitialized, selectedStoreId, currentPath, navigate])

  if (!auth.isAuthenticated || !isInitialized) return null
  return <Outlet />
}
