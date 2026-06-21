import { useRef, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ConstraintItem } from '../services/constraints'
import { DEFAULT_SERVING_SETTINGS, type PrescriptionFile, type ServingSettings } from '../types'
import { BudgetAndServingFields } from './BudgetAndServingFields'
import { ConditionsAndAllergensFields } from './ConditionsAndAllergensFields'
import { DietaryToggleList } from './DietaryToggleList'
import { PrescriptionUpload } from './PrescriptionUpload'

export interface ProfileWizardValues {
  name: string
  age: number | null
  dietaryPreferences: string[]
  budget: string
  servingSettings: ServingSettings
  conditions: ConstraintItem[]
  allergens: ConstraintItem[]
  prescriptions: PrescriptionFile[]
}

interface ProfileWizardProps {
  /** Shown only on step 1. Omit for onboarding (nothing to introduce yet). */
  intro?: string
  /** Back arrow on step 1. Omit to make step 1 unskippable (onboarding). */
  onCancel?: () => void
  onSubmit: (values: ProfileWizardValues) => Promise<void> | void
  submitLabel?: string
}

const STEP_TITLES = ['Name & Age', 'Dietary Choices', 'Serving Size', 'Conditions & Allergens']

export function ProfileWizard({
  intro,
  onCancel,
  onSubmit,
  submitLabel = 'Create Profile',
}: ProfileWizardProps) {
  const [step, setStep] = useState(1)

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([])
  const [budget, setBudget] = useState('')
  const [servingSettings, setServingSettings] = useState(DEFAULT_SERVING_SETTINGS)
  const [conditions, setConditions] = useState<ConstraintItem[]>([])
  const [allergens, setAllergens] = useState<ConstraintItem[]>([])
  const [prescriptions, setPrescriptions] = useState<PrescriptionFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  // `submitting` (state) is what disables the button visually, but state
  // updates aren't applied synchronously — a duplicate click/tap fired
  // before React re-renders (or a ghost touch-then-click event, common on
  // mobile WebViews) could otherwise slip a second submission through and
  // create two profiles from one tap. This ref blocks re-entrancy immediately.
  const hasSubmittedRef = useRef(false)

  const canAdvanceStep1 = name.trim().length > 0
  const canSubmit = canAdvanceStep1 && !submitting

  async function handleSubmit() {
    if (!canSubmit || hasSubmittedRef.current) return
    hasSubmittedRef.current = true
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        age: age ? parseInt(age, 10) : null,
        dietaryPreferences,
        budget,
        servingSettings,
        conditions,
        allergens,
        prescriptions,
      })
      // On success the caller navigates away and this wizard unmounts. We
      // deliberately leave the guard engaged: resetting it here would re-open
      // the door for a late ghost-click / duplicate tap to fire onSubmit again
      // before unmount and create a second profile.
    } catch {
      // Only re-enable submission when it actually failed, so the user can retry.
      hasSubmittedRef.current = false
      setSubmitting(false)
    }
  }

  async function handleSkip() {
    if (step < 4) {
      if (step === 1 && !name.trim()) {
        setName('User')
      }
      setStep(step + 1)
    } else {
      let finalName = name.trim()
      if (!finalName) {
        finalName = 'User'
        setName('User')
      }
      if (hasSubmittedRef.current) return
      hasSubmittedRef.current = true
      setSubmitting(true)
      try {
        await onSubmit({
          name: finalName,
          age: age ? parseInt(age, 10) : null,
          dietaryPreferences,
          budget,
          servingSettings,
          conditions,
          allergens,
          prescriptions,
        })
      } catch {
        hasSubmittedRef.current = false
        setSubmitting(false)
      }
    }
  }

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col overflow-hidden">
      <PageHeader
        title={STEP_TITLES[step - 1]}
        onBack={step === 1 ? onCancel : () => setStep(step - 1)}
        actions={<span className="text-xs text-muted-foreground">Step {step} of 4</span>}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8 flex-1 min-h-0 overflow-y-auto">
        {step === 1 && (
          <>
            {intro && <p className="text-sm text-muted-foreground">{intro}</p>}
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
          </>
        )}

        {step === 2 && (
          <DietaryToggleList selected={dietaryPreferences} onChange={setDietaryPreferences} />
        )}

        {step === 3 && (
          <BudgetAndServingFields
            budget={budget}
            onBudgetChange={setBudget}
            servingSettings={servingSettings}
            onServingSettingsChange={setServingSettings}
          />
        )}

        {step === 4 && (
          <>
            <ConditionsAndAllergensFields
              conditions={conditions}
              onConditionsChange={setConditions}
              allergens={allergens}
              onAllergensChange={setAllergens}
            />
            <PrescriptionUpload prescriptions={prescriptions} onChange={setPrescriptions} />
          </>
        )}
      </main>

      <footer className="border-t border-border shrink-0 px-4 py-3 flex gap-3">
        <Button
          type="button"
          variant="ghost"
          className="flex-1 text-muted-foreground hover:text-foreground"
          onClick={handleSkip}
          disabled={submitting}
        >
          Skip
        </Button>
        {step < 4 ? (
          <Button
            type="button"
            className="flex-1"
            disabled={step === 1 && !canAdvanceStep1}
            onClick={() => setStep(step + 1)}
          >
            Next
          </Button>
        ) : (
          <Button type="button" className="flex-1" disabled={!canSubmit} onClick={handleSubmit}>
            {submitLabel}
          </Button>
        )}
      </footer>
    </div>
  )
}
