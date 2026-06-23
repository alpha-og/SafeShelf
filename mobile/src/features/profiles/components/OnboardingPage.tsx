import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { useProfiles } from '@/providers/ProfilesProvider'
import { createProfile, setActiveProfileId } from '../services/profileStorage'
import { ProfileWizard, type ProfileWizardValues } from './ProfileWizard'

export function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasProfile } = useProfiles()

  // Leave onboarding once a profile exists.
  useEffect(() => {
    if (hasProfile) navigate({ to: '/' })
  }, [hasProfile, navigate])

  async function handleSubmit(values: ProfileWizardValues) {
    try {
      const profile = await createProfile({ ...values, isMain: true })
      await setActiveProfileId(profile.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profiles'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['activeSelection'] }),
        queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
      ])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create profile')
    }
  }

  return (
    // No cancel option — onboarding can't be skipped or exited until a main profile exists.
    <ProfileWizard
      intro="Let's set up your profile so we can tailor product checks for you."
      onSubmit={handleSubmit}
    />
  )
}
