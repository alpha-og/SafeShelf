import { createFileRoute, redirect, Outlet, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'

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
  const navigate = useNavigate()
  useEffect(() => {
    if (!auth.isAuthenticated) navigate({ to: '/signin' })
  }, [auth.isAuthenticated, navigate])
  if (!auth.isAuthenticated) return null
  return <Outlet />
}
