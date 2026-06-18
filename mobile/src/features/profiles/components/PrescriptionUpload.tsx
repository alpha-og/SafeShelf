import { FileText, Loader2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { SectionHeader } from '@/components/SectionHeader'
import { Button } from '@/components/ui/button'
import { PRESCRIPTION_ACCEPT, uploadPrescription } from '../services/prescriptions'
import type { PrescriptionFile } from '../types'

interface PrescriptionUploadProps {
  prescriptions: PrescriptionFile[]
  onChange: (next: PrescriptionFile[]) => void
}

export function PrescriptionUpload({ prescriptions, onChange }: PrescriptionUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    setError(null)
    try {
      const uploaded = await Promise.all(Array.from(fileList).map((f) => uploadPrescription(f)))
      onChange([...prescriptions, ...uploaded])
    } catch {
      setError("Couldn't upload that file. Please try again.")
    } finally {
      setUploading(false)
      // Reset so picking the same file again still fires onChange.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <section>
      <SectionHeader variant="default">Prescriptions</SectionHeader>
      <p className="text-xs text-muted-foreground mb-3">
        Upload a prescription (PDF, Word document, or photo) and we'll use it to tailor your
        conditions and allergens.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={PRESCRIPTION_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {prescriptions.length > 0 && (
        <ul className="space-y-2 mb-3">
          {prescriptions.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
            >
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{p.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{p.status}</p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                onClick={() => onChange(prescriptions.filter((x) => x.id !== p.id))}
                className="p-1.5 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? 'Uploading…' : 'Upload prescription'}
      </Button>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </section>
  )
}
