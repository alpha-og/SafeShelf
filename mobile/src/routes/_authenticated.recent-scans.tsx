import { createFileRoute } from '@tanstack/react-router'
import { RecentScansPage } from '@/features/recent-scans/components/RecentScansPage'

export const Route = createFileRoute('/_authenticated/recent-scans')({
  component: RecentScansPage,
})
