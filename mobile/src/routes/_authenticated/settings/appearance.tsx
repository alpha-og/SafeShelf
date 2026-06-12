import { createFileRoute } from '@tanstack/react-router'
import { AppearancePage } from '@/features/settings/components/AppearancePage'

export const Route = createFileRoute('/_authenticated/settings/appearance')({
  component: AppearancePage,
})
