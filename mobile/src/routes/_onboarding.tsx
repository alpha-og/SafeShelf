import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_onboarding')({
  beforeLoad: ({ context }) => {
    // Onboarding is for signed-in users only; bounce guests to the welcome screen.
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/welcome' })
    }
    if (context.profiles.hasProfile) {
      throw redirect({ to: '/' })
    }
  },
  component: () => <Outlet />,
})
