import { createFileRoute } from '@tanstack/react-router'
import { ManageProfilePage } from '@/features/profiles/components/ManageProfilePage'

export const Route = createFileRoute('/_authenticated/profile/$profileId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { profileId } = Route.useParams()
  return <ManageProfilePage profileId={profileId} />
}
