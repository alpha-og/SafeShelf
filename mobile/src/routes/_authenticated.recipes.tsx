import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/recipes')({
  beforeLoad: () => {
    throw redirect({ to: '/' })
  },
  component: () => null,
})
