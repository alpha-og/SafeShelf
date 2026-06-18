import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

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
  const navigate = useNavigate()
  useEffect(() => {
    if (!auth.isAuthenticated) navigate({ to: '/welcome' })
  }, [auth.isAuthenticated, navigate])
  if (!auth.isAuthenticated) return null
  return <Outlet />
}
