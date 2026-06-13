import { createFileRoute } from '@tanstack/react-router'
import { ConstraintsPage } from '@/features/settings/components/ConstraintsPage'

export const Route = createFileRoute('/_authenticated/settings/constraints')({
  component: ConstraintsPage,
})
