import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

interface HealthReportUploadProps {
  onFileSelected: (file: File) => void
  disabled: boolean
}

export function HealthReportUpload({ onFileSelected, disabled }: HealthReportUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleClick() {
    inputRef.current?.click()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelected(file)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="rounded-full bg-green-100 p-4">
        <Upload className="h-8 w-8 text-green-600" />
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        Upload a medical report PDF and let AI extract your health information
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleChange}
      />
      <Button size="lg" onClick={handleClick} disabled={disabled} className="bg-green-500 hover:bg-green-600 text-white">
        Upload PDF
      </Button>
    </div>
  )
}
