import { createFileRoute } from '@tanstack/react-router'
import { ManageProfilePage } from '@/features/profiles/components/ManageProfilePage'

export const Route = createFileRoute('/_authenticated/profile/new')({
  component: () => <ManageProfilePage />,
})
