import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useProfiles } from '@/providers/ProfilesProvider'
import { createProfile, setActiveProfileId } from '../services/profileStorage'
import { ProfileWizard, type ProfileWizardValues } from './ProfileWizard'

export function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { refresh, hasProfile } = useProfiles()

  // Leave onboarding once a profile exists. We navigate from an effect rather
  // than imperatively right after createProfile: the router context that drives
  // the /_authenticated profile gate only reflects the new profile on the next
  // render, so an immediate navigate('/') would be bounced straight back here by
  // a still-empty hasProfile check.
  useEffect(() => {
    if (hasProfile) navigate({ to: '/' })
  }, [hasProfile, navigate])

  async function handleSubmit(values: ProfileWizardValues) {
    const profile = await createProfile({ ...values, isMain: true })
    await setActiveProfileId(profile.id)
    queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    await refresh()
    // Navigation is handled by the effect above once hasProfile flips true.
  }

  return (
    // No cancel option — onboarding can't be skipped or exited until a main profile exists.
    <ProfileWizard
      intro="Let's set up your profile so we can tailor product checks for you."
      onSubmit={handleSubmit}
    />
  )
}
