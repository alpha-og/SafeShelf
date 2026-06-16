import { createFileRoute } from '@tanstack/react-router'
import { OnboardingPage } from '@/features/profiles/components/OnboardingPage'

export const Route = createFileRoute('/_onboarding/onboarding')({
  component: OnboardingPage,
})
