import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { HealthReportPage } from '@/features/health-report/components/HealthReportPage'
import { useProfiles } from '@/providers/ProfilesProvider'
import { createProfile, updateProfile } from '@/features/profiles/services/profileStorage'
import { healthDataToProfileFields } from '@/features/profiles/services/healthReportImport'
import type { HealthData } from '@/features/health-report/types'

export const Route = createFileRoute('/_authenticated/profile/health-report')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeProfile, activeGroupMembers, refresh } = useProfiles()

  async function handleSaveToProfile(data: HealthData) {
    if (!activeProfile) {
      throw new Error('No active profile to save to')
    }

    await updateProfile(activeProfile.id, { healthData: data })

    const affectsActiveCheck = activeGroupMembers.some((m) => m.id === activeProfile.id)
    if (affectsActiveCheck) {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    }
    await refresh()
  }

  async function handleCreateProfile(data: HealthData) {
    const name = data.personalDetails?.fullName?.trim() || 'From Health Report'
    const fields = await healthDataToProfileFields(data, '')

    await createProfile({
      name,
      age: fields.age,
      dietaryPreferences: fields.dietaryPreferences,
      budget: '',
      servingSettings: { minSolidG: 15, minLiquidMl: 100 },
      conditions: fields.conditions,
      allergens: fields.allergens,
      isMain: false,
      healthData: data,
    })

    await refresh()
    navigate({ to: '/profile' })
  }

  return (
    <HealthReportPage onSaveToProfile={handleSaveToProfile} onCreateProfile={handleCreateProfile} />
  )
}
