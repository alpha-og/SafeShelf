import { createFileRoute } from '@tanstack/react-router'
import { EditGroupPage } from '@/features/profiles/components/EditGroupPage'

export const Route = createFileRoute('/_authenticated/profile/groups/$groupId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { groupId } = Route.useParams()
  return <EditGroupPage groupId={groupId} />
}
