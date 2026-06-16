import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const auth = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (auth.isAuthenticated) navigate({ to: '/' })
  }, [auth.isAuthenticated, navigate])
  if (auth.isAuthenticated) return null
  return <Outlet />
}
