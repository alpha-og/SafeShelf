import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { FormError } from '@/components/FormError'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProfiles } from '@/providers/ProfilesProvider'
import type { ConstraintItem } from '../services/constraints'
import { createProfile, deleteProfile, getProfile, updateProfile } from '../services/profileStorage'
import { DEFAULT_SERVING_SETTINGS, type PrescriptionFile } from '../types'
import { BudgetAndServingFields } from './BudgetAndServingFields'
import { ConditionsAndAllergensFields } from './ConditionsAndAllergensFields'
import { DietaryChoicesScreen } from './DietaryChoicesScreen'
import { DietarySummaryButton } from './DietarySummaryButton'
import { PrescriptionUpload } from './PrescriptionUpload'
import { ProfileWizard, type ProfileWizardValues } from './ProfileWizard'

interface ManageProfilePageProps {
  /** Omitted in create-mode (the "Add profile" flow); present when editing an existing profile. */
  profileId?: string
}

export function ManageProfilePage({ profileId }: ManageProfilePageProps) {
  const isNew = !profileId
  const navigate = useNavigate()
  const { refresh } = useProfiles()

  // ---- Create mode: step-by-step wizard, mirrors onboarding -------------
  if (isNew) {
    async function handleCreate(values: ProfileWizardValues) {
      await createProfile({ ...values, isMain: false })
      await refresh()
      navigate({ to: '/profile' })
    }
    return <ProfileWizard onCancel={() => navigate({ to: '/profile' })} onSubmit={handleCreate} />
  }

  return <EditProfileForm profileId={profileId} />
}

// ---- Edit mode: single page showing every field at once -----------------

function EditProfileForm({ profileId }: { profileId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeProfile, activeGroupMembers, refresh } = useProfiles()

  const [loaded, setLoaded] = useState(false)
  const [showDietaryDetail, setShowDietaryDetail] = useState(false)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([])
  const [budget, setBudget] = useState('')
  const [servingSettings, setServingSettings] = useState(DEFAULT_SERVING_SETTINGS)
  const [conditions, setConditions] = useState<ConstraintItem[]>([])
  const [allergens, setAllergens] = useState<ConstraintItem[]>([])
  const [prescriptions, setPrescriptions] = useState<PrescriptionFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    getProfile(profileId).then((profile) => {
      if (profile) {
        setName(profile.name)
        setAge(profile.age != null ? String(profile.age) : '')
        setDietaryPreferences(profile.dietaryPreferences)
        setBudget(profile.budget)
        setServingSettings(profile.servingSettings)
        setConditions(profile.conditions)
        setAllergens(profile.allergens)
        setPrescriptions(profile.prescriptions ?? [])
      }
      setLoaded(true)
    })
  }, [profileId])

  const canSubmit = name.trim().length > 0 && !submitting

  async function handleSave() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await updateProfile(profileId, {
        name: name.trim(),
        age: age ? parseInt(age, 10) : null,
        dietaryPreferences,
        budget,
        servingSettings,
        conditions,
        allergens,
        prescriptions,
      })
      // The edited profile may be driving suitability directly, or as a
      // member of the currently active Group Buy group — either way the
      // merged check needs to pick up the change.
      const affectsActiveCheck =
        profileId === activeProfile?.id || activeGroupMembers.some((m) => m.id === profileId)
      if (affectsActiveCheck) {
        queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      }
      await refresh()
      navigate({ to: '/profile' })
    } catch (err) {
      setError(err as Error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setError(null)
    try {
      const affectsActiveCheck =
        profileId === activeProfile?.id || activeGroupMembers.some((m) => m.id === profileId)
      await deleteProfile(profileId)
      await refresh()
      if (affectsActiveCheck) {
        queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      }
      navigate({ to: '/profile' })
    } catch (err) {
      setError(err as Error)
    }
  }

  if (!loaded) return null

  if (showDietaryDetail) {
    return (
      <DietaryChoicesScreen
        selected={dietaryPreferences}
        onChange={setDietaryPreferences}
        onBack={() => setShowDietaryDetail(false)}
      />
    )
  }

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col overflow-hidden">
      <PageHeader title={name || 'Manage Profile'} onBack={() => navigate({ to: '/profile' })} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8 flex-1 min-h-0 overflow-y-auto">
        <section className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-foreground mb-2 block">
              Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              placeholder="e.g. John Doe"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="age" className="text-sm font-medium text-foreground mb-2 block">
              Age
            </label>
            <Input
              id="age"
              type="text"
              inputMode="numeric"
              value={age}
              placeholder="e.g. 30"
              onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </section>

        <section>
          <DietarySummaryButton
            selected={dietaryPreferences}
            onClick={() => setShowDietaryDetail(true)}
          />
        </section>

        <BudgetAndServingFields
          budget={budget}
          onBudgetChange={setBudget}
          servingSettings={servingSettings}
          onServingSettingsChange={setServingSettings}
        />

        <ConditionsAndAllergensFields
          conditions={conditions}
          onConditionsChange={setConditions}
          allergens={allergens}
          onAllergensChange={setAllergens}
        />

        <PrescriptionUpload prescriptions={prescriptions} onChange={setPrescriptions} />
      </main>

      <footer className="border-t border-border shrink-0 px-4 py-3 space-y-2">
        <FormError error={error} fallback="Couldn't save this profile" />
        <div className="flex gap-2">
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
          <Button className="flex-1" size="lg" disabled={!canSubmit} onClick={handleSave}>
            Save
          </Button>
        </div>
      </footer>
    </div>
  )
}
