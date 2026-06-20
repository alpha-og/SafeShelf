import { ChevronDown, ChevronUp, FileText, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { SectionHeader } from '@/components/SectionHeader'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { HealthData } from '@/features/health-report/types'

interface AdditionalInfoSectionProps {
  healthData: HealthData | null
  /** Name of the report the data was extracted from, if known. */
  fileName?: string | null
  /** Clears the imported additional information so a new report can be added. */
  onDelete: () => void
}

type Row = { label: string; value: string | number | null | undefined }

/** Drop rows whose value is null/undefined/empty, then format the keepers. */
function present(rows: Row[]): { label: string; value: string }[] {
  return rows
    .filter((r) => r.value != null && String(r.value).trim() !== '')
    .map((r) => ({ label: r.label, value: String(r.value) }))
}

function Group({ title, rows }: { title: string; rows: Row[] }) {
  const kept = present(rows)
  if (kept.length === 0) return null
  return (
    <div className="space-y-2 py-3">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {kept.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{r.label}</span>
          <span className="text-sm text-foreground font-medium text-right">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Read-only view of the richer health-report data captured on a profile —
 * everything beyond the editable basics (physical metrics, vitals, lab panels).
 * Populated whenever a health report is uploaded, either from this profile form
 * or the standalone "Upload & manage health reports" flow. Renders nothing when
 * no report has been imported.
 */
export function AdditionalInfoSection({
  healthData,
  fileName,
  onDelete,
}: AdditionalInfoSectionProps) {
  const [open, setOpen] = useState(false)

  if (!healthData) return null

  const pd = healthData.personalDetails
  const pm = healthData.physicalMetrics
  const bp = healthData.bloodPressure
  const bs = healthData.bloodSugar
  const lp = healthData.lipidProfile
  const tp = healthData.thyroidProfile
  const meta = healthData.metadata

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: 'Personal Details',
      rows: [
        { label: 'Gender', value: pd?.gender },
        { label: 'Date of Birth', value: pd?.dateOfBirth },
      ],
    },
    {
      title: 'Physical Metrics',
      rows: [
        { label: 'Height', value: pm?.height != null ? `${pm.height} ${pm.heightUnit ?? 'cm'}` : null },
        { label: 'Weight', value: pm?.weight != null ? `${pm.weight} ${pm.weightUnit ?? 'kg'}` : null },
        { label: 'BMI', value: pm?.bmi },
      ],
    },
    {
      title: 'Blood Pressure',
      rows: [
        { label: 'Systolic (mmHg)', value: bp?.systolic },
        { label: 'Diastolic (mmHg)', value: bp?.diastolic },
      ],
    },
    {
      title: 'Blood Sugar',
      rows: [
        { label: `Fasting (${bs?.fastingBloodSugarUnit ?? 'mg/dL'})`, value: bs?.fastingBloodSugar },
        { label: `HbA1c (${bs?.hba1cUnit ?? '%'})`, value: bs?.hba1c },
        { label: `Random (${bs?.randomBloodSugarUnit ?? 'mg/dL'})`, value: bs?.randomBloodSugar },
      ],
    },
    {
      title: 'Lipid Profile',
      rows: [
        { label: `Total Cholesterol (${lp?.totalCholesterolUnit ?? 'mg/dL'})`, value: lp?.totalCholesterol },
        { label: `LDL (${lp?.ldlUnit ?? 'mg/dL'})`, value: lp?.ldl },
        { label: `HDL (${lp?.hdlUnit ?? 'mg/dL'})`, value: lp?.hdl },
        { label: `Triglycerides (${lp?.triglyceridesUnit ?? 'mg/dL'})`, value: lp?.triglycerides },
      ],
    },
    {
      title: 'Thyroid Profile',
      rows: [{ label: `TSH (${tp?.tshUnit ?? 'mIU/L'})`, value: tp?.tsh }],
    },
    {
      title: 'Report Info',
      rows: [
        { label: 'Report Date', value: meta?.reportDate },
        { label: 'Laboratory', value: meta?.laboratory },
      ],
    },
  ]

  const visible = groups.filter((g) => present(g.rows).length > 0)
  if (visible.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <SectionHeader variant="default">Additional Information</SectionHeader>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete additional information"
          className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {fileName ? (
            <>
              Extracted from <span className="text-foreground">{fileName}</span>
            </>
          ) : (
            'Extracted from an uploaded health report'
          )}
        </span>
      </div>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground">
          {open ? 'Hide details' : 'Show details'}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="divide-y divide-border px-1">
          {visible.map((g) => (
            <Group key={g.title} title={g.title} rows={g.rows} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}
