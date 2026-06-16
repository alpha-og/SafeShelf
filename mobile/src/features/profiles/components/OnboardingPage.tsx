import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useProfiles } from '@/providers/ProfilesProvider'
import { createProfile, setActiveProfileId } from '../services/profileStorage'
import { ProfileWizard, type ProfileWizardValues } from './ProfileWizard'

export function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { refresh } = useProfiles()

  async function handleSubmit(values: ProfileWizardValues) {
    const profile = await createProfile({ ...values, isMain: true })
    await setActiveProfileId(profile.id)
    await refresh()
    queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    navigate({ to: '/' })
  }

  return (
    // No cancel option — onboarding can't be skipped or exited until a main profile exists.
    <ProfileWizard
      intro="Let's set up your profile so we can tailor product checks for you."
      onSubmit={handleSubmit}
    />
  )
}
