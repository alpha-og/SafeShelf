import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_onboarding')({
  beforeLoad: ({ context }) => {
    if (context.profiles.hasProfile) {
      throw redirect({ to: '/' })
    }
  },
  component: () => <Outlet />,
})
