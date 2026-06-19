import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { HealthReportPage } from '@/features/health-report/components/HealthReportPage'
import { useProfiles } from '@/providers/ProfilesProvider'
import { createProfile, updateProfile } from '@/features/profiles/services/profileStorage'
import type { HealthData } from '@/features/health-report/types'

export const Route = createFileRoute('/_authenticated/profile/health-report')({
  component: RouteComponent,
})

const CONDITION_NAMES: Record<string, string> = {
  diabetes: 'Diabetes',
  hypertension: 'Hypertension',
  highCholesterol: 'High Cholesterol',
  thyroidDisorder: 'Thyroid Disorder',
  heartDisease: 'Heart Disease',
  kidneyDisease: 'Kidney Disease',
}

const ALLERGEN_NAMES: Record<string, string> = {
  peanut: 'Peanut',
  milk: 'Milk',
  gluten: 'Gluten',
  soy: 'Soy',
  egg: 'Egg',
  treeNuts: 'Tree Nuts',
  shellfish: 'Shellfish',
}

function RouteComponent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeProfile, activeGroupMembers, refresh } = useProfiles()

  async function lookupCondition(name: string): Promise<{ name: string; id: string }> {
    try {
      const res = await api.get<{ id: string; name: string }[]>('/v1/conditions/search', {
        params: { q: name },
      })
      if (res.data.length > 0) {
        return { name: res.data[0].name, id: res.data[0].id }
      }
    } catch {
      // WHO API unavailable — fall through to hardcoded fallback
    }
    return { name, id: '' }
  }

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
    const age = data.personalDetails?.age ?? null

    const conditions: { name: string; id: string }[] = []
    if (data.medicalConditions) {
      const entries = Object.entries(data.medicalConditions).filter(([, v]) => v === true)
      const results = await Promise.all(
        entries.map(([key]) => lookupCondition(CONDITION_NAMES[key] ?? key)),
      )
      conditions.push(...results)
    }

    const allergens: { name: string; id: string }[] = []
    if (data.allergies) {
      for (const [key, value] of Object.entries(data.allergies)) {
        if (key !== 'otherAllergies' && value === true && ALLERGEN_NAMES[key]) {
          allergens.push({ name: ALLERGEN_NAMES[key], id: '' })
        }
      }
      if (Array.isArray(data.allergies.otherAllergies)) {
        for (const a of data.allergies.otherAllergies) {
          allergens.push({ name: a, id: '' })
        }
      }
    }

    const dietaryPreferences = data.personalDetails?.dietaryPreferences ?? []

    await createProfile({
      name,
      age,
      dietaryPreferences,
      budget: '',
      servingSettings: { minSolidG: 15, minLiquidMl: 100 },
      conditions,
      allergens,
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
