import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { HealthData } from '../types'

interface HealthReportReviewProps {
  data: HealthData
  onSave: (data: HealthData) => void
  onCancel: () => void
  onCreateProfile?: (data: HealthData) => void
  saving: boolean
}

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-3 text-sm font-medium text-foreground">
        {title}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

interface FieldRowProps {
  label: string
  value: string | number | null | undefined
  onChange?: (value: string) => void
  confidence?: string | null
}

function FieldRow({ label, value, onChange, confidence }: FieldRowProps) {
  const displayValue = value != null ? String(value) : ''
  const isLowConfidence = confidence === 'low'
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
        {label}
        {isLowConfidence && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">low</Badge>
        )}
      </span>
      {onChange ? (
        <Input
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-40 h-8 text-sm text-right"
        />
      ) : (
        <span className="text-sm text-foreground font-medium">{displayValue || '—'}</span>
      )}
    </div>
  )
}

function BoolBadge({ value, onChange }: { value: boolean | null | undefined; onChange?: (v: boolean | null) => void }) {
  if (onChange) {
    return (
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`text-xs px-2 py-0.5 rounded-full border ${value === true ? 'bg-destructive text-destructive-foreground border-destructive' : 'border-border text-muted-foreground'}`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`text-xs px-2 py-0.5 rounded-full border ${value === false ? 'bg-secondary text-secondary-foreground border-border' : 'border-border text-muted-foreground'}`}
        >
          No
        </button>
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`text-xs px-2 py-0.5 rounded-full border ${value === null || value === undefined ? 'border-border text-muted-foreground' : 'border-border text-muted-foreground'} `}
        >
          ?
        </button>
      </div>
    )
  }
  if (value === true) return <Badge variant="destructive" className="text-xs">Yes</Badge>
  if (value === false) return <Badge variant="secondary" className="text-xs">No</Badge>
  return <span className="text-xs text-muted-foreground">—</span>
}

function num(val: string): number | null {
  const n = parseFloat(val)
  return Number.isNaN(n) ? null : n
}

type HealthSection = keyof HealthData

export function HealthReportReview({ data, onSave, onCancel, onCreateProfile, saving }: HealthReportReviewProps) {
  const [edited, setEdited] = useState<HealthData>(structuredClone(data))

  function edit(section: HealthSection, field: string, value: unknown) {
    setEdited((prev) => {
      const sectionData = { ...((prev[section] as Record<string, unknown>) || {}) }
      sectionData[field] = value
      return { ...prev, [section]: sectionData }
    })
  }

  function toggleBool(section: HealthSection, field: string) {
    setEdited((prev) => {
      const sectionData = { ...((prev[section] as Record<string, unknown>) || {}) }
      const current = sectionData[field]
      if (current === true) sectionData[field] = false
      else if (current === false) sectionData[field] = null
      else sectionData[field] = true
      return { ...prev, [section]: sectionData }
    })
  }

  function handleSave() {
    onSave(edited)
  }

  const pd = edited.personalDetails as Record<string, unknown> | undefined
  const pm = edited.physicalMetrics as Record<string, unknown> | undefined
  const mc = edited.medicalConditions as Record<string, unknown> | undefined
  const al = edited.allergies as Record<string, unknown> | undefined
  const bp = edited.bloodPressure as Record<string, unknown> | undefined
  const bs = edited.bloodSugar as Record<string, unknown> | undefined
  const lp = edited.lipidProfile as Record<string, unknown> | undefined
  const tp = edited.thyroidProfile as Record<string, unknown> | undefined

  return (
    <div className="flex flex-col min-h-0 overflow-hidden flex-1">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 divide-y divide-border">
        <CollapsibleSection title="Personal Details">
          <FieldRow label="Full Name" value={pd?.fullName as string | undefined} onChange={(v) => edit('personalDetails', 'fullName', v)} />
          <FieldRow label="Age" value={pd?.age as number | undefined} onChange={(v) => edit('personalDetails', 'age', num(v))} />
          <FieldRow label="Date of Birth" value={pd?.dateOfBirth as string | undefined} onChange={(v) => edit('personalDetails', 'dateOfBirth', v)} />
          <FieldRow label="Gender" value={pd?.gender as string | undefined} onChange={(v) => edit('personalDetails', 'gender', v)} />
          <FieldRow
            label="Dietary Preferences"
            value={Array.isArray(pd?.dietaryPreferences) ? (pd!.dietaryPreferences as string[]).join(', ') : undefined}
            onChange={(v) => edit('personalDetails', 'dietaryPreferences', v ? v.split(',').map((s) => s.trim()) : [])}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Physical Metrics">
          <FieldRow label="Height (cm)" value={pm?.height as number | undefined} onChange={(v) => edit('physicalMetrics', 'height', num(v))} />
          <FieldRow label="Weight (kg)" value={pm?.weight as number | undefined} onChange={(v) => edit('physicalMetrics', 'weight', num(v))} />
          <FieldRow label="BMI" value={pm?.bmi as number | undefined} onChange={(v) => edit('physicalMetrics', 'bmi', num(v))} />
        </CollapsibleSection>

        <CollapsibleSection title="Medical Conditions">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Diabetes</span>
            <BoolBadge value={mc?.diabetes as boolean | undefined} onChange={() => toggleBool('medicalConditions', 'diabetes')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Hypertension</span>
            <BoolBadge value={mc?.hypertension as boolean | undefined} onChange={() => toggleBool('medicalConditions', 'hypertension')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">High Cholesterol</span>
            <BoolBadge value={mc?.highCholesterol as boolean | undefined} onChange={() => toggleBool('medicalConditions', 'highCholesterol')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Thyroid Disorder</span>
            <BoolBadge value={mc?.thyroidDisorder as boolean | undefined} onChange={() => toggleBool('medicalConditions', 'thyroidDisorder')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Heart Disease</span>
            <BoolBadge value={mc?.heartDisease as boolean | undefined} onChange={() => toggleBool('medicalConditions', 'heartDisease')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Kidney Disease</span>
            <BoolBadge value={mc?.kidneyDisease as boolean | undefined} onChange={() => toggleBool('medicalConditions', 'kidneyDisease')} />
          </div>
          {Array.isArray(mc?.otherConditions) && (mc.otherConditions as string[]).length > 0 && (
            <div className="pt-1">
              <span className="text-sm text-muted-foreground">Other Conditions</span>
              <ul className="mt-1 space-y-1">
                {(mc.otherConditions as string[]).map((c) => (
                  <li key={c} className="text-sm text-foreground">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Allergies">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Peanut</span>
            <BoolBadge value={al?.peanut as boolean | undefined} onChange={() => toggleBool('allergies', 'peanut')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Milk</span>
            <BoolBadge value={al?.milk as boolean | undefined} onChange={() => toggleBool('allergies', 'milk')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Gluten</span>
            <BoolBadge value={al?.gluten as boolean | undefined} onChange={() => toggleBool('allergies', 'gluten')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Soy</span>
            <BoolBadge value={al?.soy as boolean | undefined} onChange={() => toggleBool('allergies', 'soy')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Egg</span>
            <BoolBadge value={al?.egg as boolean | undefined} onChange={() => toggleBool('allergies', 'egg')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tree Nuts</span>
            <BoolBadge value={al?.treeNuts as boolean | undefined} onChange={() => toggleBool('allergies', 'treeNuts')} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Shellfish</span>
            <BoolBadge value={al?.shellfish as boolean | undefined} onChange={() => toggleBool('allergies', 'shellfish')} />
          </div>
          <FieldRow
            label="Other Allergies"
            value={Array.isArray(al?.otherAllergies) ? (al!.otherAllergies as string[]).join(', ') : undefined}
            onChange={(v) => edit('allergies', 'otherAllergies', v ? v.split(',').map((s) => s.trim()) : [])}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Blood Pressure" defaultOpen={!!bp?.systolic || !!bp?.diastolic}>
          <FieldRow label="Systolic (mmHg)" value={bp?.systolic as number | undefined} onChange={(v) => edit('bloodPressure', 'systolic', num(v))} />
          <FieldRow label="Diastolic (mmHg)" value={bp?.diastolic as number | undefined} onChange={(v) => edit('bloodPressure', 'diastolic', num(v))} />
        </CollapsibleSection>

        <CollapsibleSection title="Blood Sugar" defaultOpen={!!bs?.fastingBloodSugar || !!bs?.hba1c || !!bs?.randomBloodSugar}>
          <FieldRow
            label={`Fasting ${bs?.fastingBloodSugarUnit ? `(${bs.fastingBloodSugarUnit})` : '(mg/dL)'}`}
            value={bs?.fastingBloodSugar as number | undefined}
            onChange={(v) => edit('bloodSugar', 'fastingBloodSugar', num(v))}
          />
          <FieldRow
            label={`HbA1c ${bs?.hba1cUnit ? `(${bs.hba1cUnit})` : '(%)'}`}
            value={bs?.hba1c as number | undefined}
            onChange={(v) => edit('bloodSugar', 'hba1c', num(v))}
          />
          <FieldRow
            label={`Random ${bs?.randomBloodSugarUnit ? `(${bs.randomBloodSugarUnit})` : '(mg/dL)'}`}
            value={bs?.randomBloodSugar as number | undefined}
            onChange={(v) => edit('bloodSugar', 'randomBloodSugar', num(v))}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Lipid Profile" defaultOpen={!!lp?.totalCholesterol || !!lp?.ldl || !!lp?.hdl || !!lp?.triglycerides}>
          <FieldRow
            label={`Total Chol. ${lp?.totalCholesterolUnit ? `(${lp.totalCholesterolUnit})` : '(mg/dL)'}`}
            value={lp?.totalCholesterol as number | undefined}
            onChange={(v) => edit('lipidProfile', 'totalCholesterol', num(v))}
          />
          <FieldRow
            label={`LDL ${lp?.ldlUnit ? `(${lp.ldlUnit})` : '(mg/dL)'}`}
            value={lp?.ldl as number | undefined}
            onChange={(v) => edit('lipidProfile', 'ldl', num(v))}
          />
          <FieldRow
            label={`HDL ${lp?.hdlUnit ? `(${lp.hdlUnit})` : '(mg/dL)'}`}
            value={lp?.hdl as number | undefined}
            onChange={(v) => edit('lipidProfile', 'hdl', num(v))}
          />
          <FieldRow
            label={`Triglycerides ${lp?.triglyceridesUnit ? `(${lp.triglyceridesUnit})` : '(mg/dL)'}`}
            value={lp?.triglycerides as number | undefined}
            onChange={(v) => edit('lipidProfile', 'triglycerides', num(v))}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Thyroid Profile" defaultOpen={!!tp?.tsh}>
          <FieldRow
            label={`TSH ${tp?.tshUnit ? `(${tp.tshUnit})` : '(mIU/L)'}`}
            value={tp?.tsh as number | undefined}
            onChange={(v) => edit('thyroidProfile', 'tsh', num(v))}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Report Info" defaultOpen={false}>
          <FieldRow label="Report Date" value={edited.metadata?.reportDate} />
          <FieldRow label="Laboratory" value={edited.metadata?.laboratory} />
          <FieldRow label="Confidence" value={edited.confidence?.overall} />
        </CollapsibleSection>
      </div>

      <footer className="shrink-0 border-t border-border px-4 py-3 space-y-2">
        {onCreateProfile && (
          <Button className="w-full" size="lg" onClick={() => onCreateProfile(edited)} disabled={saving}>
            {saving ? 'Creating...' : 'Create Profile with Details'}
          </Button>
        )}
        <Button className="w-full" size="lg" variant="secondary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save to Current Profile'}
        </Button>
        <Button variant="outline" className="w-full" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </footer>
    </div>
  )
}
