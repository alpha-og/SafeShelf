import { useRef, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { HealthData } from '@/features/health-report/types'
import { type ConstraintItem, mergeConstraints } from '../services/constraints'
import { DEFAULT_SERVING_SETTINGS, type ServingSettings } from '../types'
import { AdditionalInfoSection } from './AdditionalInfoSection'
import { BudgetAndServingFields } from './BudgetAndServingFields'
import { ConditionsAndAllergensFields } from './ConditionsAndAllergensFields'
import { DietaryToggleList } from './DietaryToggleList'
import { HealthReportImport } from './HealthReportImport'

export interface ProfileWizardValues {
  name: string
  age: number | null
  dietaryPreferences: string[]
  budget: string
  servingSettings: ServingSettings
  conditions: ConstraintItem[]
  allergens: ConstraintItem[]
  healthData: HealthData | null
  healthReportFileName: string | null
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
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [healthReportFileName, setHealthReportFileName] = useState<string | null>(null)
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
        healthData,
        healthReportFileName,
      })
    } finally {
      hasSubmittedRef.current = false
      setSubmitting(false)
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
            <HealthReportImport
              onImported={(fields) => {
                if (fields.age != null) setAge(String(fields.age))
                setDietaryPreferences((prev) => [
                  ...prev,
                  ...fields.dietaryPreferences.filter((d) => !prev.includes(d)),
                ])
                setConditions((prev) => mergeConstraints(prev, fields.conditions))
                setAllergens((prev) => mergeConstraints(prev, fields.allergens))
                setHealthData(fields.healthData)
                setHealthReportFileName(fields.sourceFileName)
              }}
            />

            <AdditionalInfoSection
              healthData={healthData}
              fileName={healthReportFileName}
              onDelete={() => {
                setHealthData(null)
                setHealthReportFileName(null)
              }}
            />
          </>
        )}
      </main>

      <footer className="border-t border-border shrink-0 px-4 py-3">
        {step < 4 ? (
          <Button
            type="button"
            className="w-full"
            size="lg"
            disabled={step === 1 && !canAdvanceStep1}
            onClick={() => setStep(step + 1)}
          >
            Next
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full"
            size="lg"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {submitLabel}
          </Button>
        )}
      </footer>
    </div>
  )
}
