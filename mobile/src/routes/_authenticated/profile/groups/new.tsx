import { createFileRoute } from '@tanstack/react-router'
import { EditGroupPage } from '@/features/profiles/components/EditGroupPage'

export const Route = createFileRoute('/_authenticated/profile/groups/new')({
  component: () => <EditGroupPage />,
})
