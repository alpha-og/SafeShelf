import { useNavigate } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { FormError } from '@/components/FormError'
import { uploadHealthReport } from '../services/healthReport'
import { HealthReportUpload } from './HealthReportUpload'
import { HealthReportReview } from './HealthReportReview'
import type { HealthData, ReviewState } from '../types'

interface HealthReportPageProps {
  onSaveToProfile: (data: HealthData) => Promise<void>
  onCreateProfile?: (data: HealthData) => Promise<void>
}

export function HealthReportPage({ onSaveToProfile, onCreateProfile }: HealthReportPageProps) {
  const navigate = useNavigate()
  const [state, setState] = useState<ReviewState>({ phase: 'idle' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const handleFileSelected = useCallback(async (file: File) => {
    setState({ phase: 'uploading', progress: 0 })
    setError(null)

    try {
      const result = await uploadHealthReport(file)
      setState({ phase: 'review', data: result.extractedData, reportId: result.id })
    } catch (err) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err as Error).message ??
        'Failed to process report'
      setState({ phase: 'error', message })
    }
  }, [])

  const handleSave = useCallback(
    async (data: HealthData) => {
      setSaving(true)
      setError(null)
      try {
        await onSaveToProfile(data)
        navigate({ to: '/profile' })
      } catch (err) {
        setError(err as Error)
      } finally {
        setSaving(false)
      }
    },
    [onSaveToProfile, navigate],
  )

  function handleCancel() {
    setState({ phase: 'idle' })
  }

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col overflow-hidden">
      <PageHeader title="Health Report" onBack={() => navigate({ to: '/profile' })} />

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {state.phase === 'idle' && (
          <HealthReportUpload onFileSelected={handleFileSelected} disabled={false} />
        )}

        {(state.phase === 'uploading' || state.phase === 'processing') && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
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
            onSave={handleSave}
            onCancel={handleCancel}
            onCreateProfile={onCreateProfile}
            saving={saving}
          />
        )}

        {state.phase === 'error' && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-4">
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
              Try again
            </button>
          </div>
        )}
      </main>

      <div className="shrink-0 px-4 pb-3">
        <FormError error={error} fallback="Failed to save health data to profile" />
      </div>
    </div>
  )
}
