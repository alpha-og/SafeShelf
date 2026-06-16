import { createFileRoute } from '@tanstack/react-router'
import { ProfileHubPage } from '@/features/profiles/components/ProfileHubPage'

export const Route = createFileRoute('/_authenticated/profile/')({
  component: ProfileHubPage,
})
