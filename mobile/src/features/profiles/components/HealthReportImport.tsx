import { AlertCircle, Loader2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { SectionHeader } from '@/components/SectionHeader'
import { Button } from '@/components/ui/button'
import { HealthReportReview } from '@/features/health-report/components/HealthReportReview'
import { uploadHealthReport } from '@/features/health-report/services/healthReport'
import type { HealthData } from '@/features/health-report/types'
import {
  HEALTH_REPORT_ACCEPT,
  healthDataToProfileFields,
  type ImportedProfileFields,
} from '../services/healthReportImport'

interface HealthReportImportProps {
  /** Called with every profile field the report could fill (all except name),
   * after the user reviews and confirms the AI-extracted data. */
  onImported: (fields: ImportedProfileFields) => void
}

type Phase =
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'review'; data: HealthData; fileName: string }
  | { phase: 'error'; message: string }

export function HealthReportImport({ onImported }: HealthReportImportProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<Phase>({ phase: 'idle' })
  const [saving, setSaving] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setState({ phase: 'uploading' })
    try {
      const { extractedData } = await uploadHealthReport(file)
      setState({ phase: 'review', data: extractedData, fileName: file.name })
    } catch (err) {
      // Surface the real reason: a backend `detail` when the server replied, else
      // the transport error (timeout / network). Log the full error for debugging.
      console.error('Health report upload failed:', err)
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      const message =
        (typeof detail === 'string' ? detail : undefined) ??
        (err as Error)?.message ??
        "Couldn't read that report. Please try again."
      setState({ phase: 'error', message })
    } finally {
      // Reset so picking the same file again still fires onChange.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleSave(data: HealthData, fileName: string) {
    setSaving(true)
    try {
      const fields = await healthDataToProfileFields(data, fileName)
      onImported(fields)
      setState({ phase: 'idle' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <SectionHeader variant="default">Health Report</SectionHeader>
      <p className="text-xs text-muted-foreground mb-3">
        Upload a medical report (PDF). Our AI reads it, you review the extracted details, and we
        fill in this profile's age, dietary preferences, conditions, and allergens.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={HEALTH_REPORT_ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        Upload health report
      </Button>

      {state.phase !== 'idle' && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <PageHeader
            title="Health Report"
            onBack={saving ? undefined : () => setState({ phase: 'idle' })}
          />

          {state.phase === 'uploading' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">AI is analyzing your report...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Extracting health information intelligently
                </p>
              </div>
            </div>
          )}

          {state.phase === 'review' && (
            <HealthReportReview
              data={state.data}
              onSave={(data) => handleSave(data, state.fileName)}
              onCancel={() => setState({ phase: 'idle' })}
              saving={saving}
            />
          )}

          {state.phase === 'error' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="text-center max-w-xs">
                <p className="text-sm font-medium text-foreground">Upload failed</p>
                <p className="text-xs text-muted-foreground mt-2">{state.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setState({ phase: 'idle' })}
                className="text-sm text-primary underline-offset-4 hover:underline mt-2"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
