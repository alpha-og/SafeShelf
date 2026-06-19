import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import type { ClarificationField } from '../services/recipe'
import { inferWidget } from '../utils/widgetMapper'
import type { WidgetConfig } from '../utils/widgetMapper'

interface ClarificationSheetProps {
  open: boolean
  clarifications: ClarificationField[]
  loading: boolean
  onSubmit: (answers: Record<string, unknown>) => void
  onDismiss: () => void
}

function SingleSelect({
  config,
  value,
  onChange,
}: {
  config: WidgetConfig
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(config.enum ?? []).map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
            value === opt
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-foreground border-border hover:bg-accent'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function MultiSelect({
  config,
  value,
  onChange,
}: {
  config: WidgetConfig
  value: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter((x) => x !== opt))
    } else {
      onChange([...value, opt])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(config.enum ?? []).map((opt) => (
        <button
          key={opt}
          onClick={() => toggle(opt)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
            value.includes(opt)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-foreground border-border hover:bg-accent'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function TextInput({
  config,
  value,
  onChange,
}: {
  config: WidgetConfig
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={config.maxLength}
      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      placeholder="Type your answer…"
    />
  )
}

function NumberInput({
  config,
  value,
  onChange,
}: {
  config: WidgetConfig
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      min={config.minimum}
      max={config.maximum}
      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      placeholder="Enter a number…"
    />
  )
}

function BooleanToggle({
  value,
  onChange,
}: {
  value: boolean | null
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onChange(true)}
        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
          value === true
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background text-foreground border-border hover:bg-accent'
        }`}
      >
        Yes
      </button>
      <button
        onClick={() => onChange(false)}
        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
          value === false
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background text-foreground border-border hover:bg-accent'
        }`}
      >
        No
      </button>
    </div>
  )
}

function WidgetRenderer({
  field,
  value,
  onChange,
}: {
  field: ClarificationField
  value: unknown
  onChange: (v: unknown) => void
}) {
  const config = inferWidget(field.schema)

  switch (config.widget) {
    case 'singleSelect':
      return <SingleSelect config={config} value={(value as string) ?? ''} onChange={onChange} />
    case 'multiSelect':
      return <MultiSelect config={config} value={(value as string[]) ?? []} onChange={onChange} />
    case 'textInput':
      return <TextInput config={config} value={(value as string) ?? ''} onChange={onChange} />
    case 'numberInput':
      return <NumberInput config={config} value={(value as number | null) ?? null} onChange={onChange} />
    case 'booleanToggle':
      return <BooleanToggle value={(value as boolean | null) ?? null} onChange={onChange} />
  }
}

function fieldHasAnswer(value: unknown, schema: Record<string, unknown> | null | undefined): boolean {
  if (!schema) return value !== undefined && value !== null && value !== ''
  const type = schema.type
  if (type === 'string') return typeof value === 'string' && value.length > 0
  if (type === 'array') return Array.isArray(value) && value.length > 0
  if (type === 'boolean') return value === true || value === false
  if (type === 'integer' || type === 'number') return typeof value === 'number'
  return value !== undefined && value !== null && value !== ''
}

export function ClarificationSheet({
  open,
  clarifications,
  loading,
  onSubmit,
  onDismiss,
}: ClarificationSheetProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({})

  const setAnswer = (id: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }

  const allAnswered = clarifications.every((f) => fieldHasAnswer(answers[f.id], f.schema))

  const handleSubmit = () => {
    if (!allAnswered || loading) return
    onSubmit(answers)
    setAnswers({})
  }

  return (
    <Sheet open={open} onOpenChange={(open) => { if (!open) onDismiss() }}>
      <SheetContent side="bottom" className="px-0 py-0 max-h-[85dvh] flex flex-col">
        <SheetHeader className="px-4 pt-6 pb-2 shrink-0">
          <SheetTitle>Let's narrow it down</SheetTitle>
          <SheetDescription>
            Answer a few questions to find the perfect recipe.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
          {clarifications.map((field) => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {field.label}
              </label>
              {field.description && (
                <p className="text-xs text-muted-foreground mb-2">{field.description}</p>
              )}
              <WidgetRenderer
                field={field}
                value={answers[field.id]}
                onChange={(v) => setAnswer(field.id, v)}
              />
            </div>
          ))}
        </div>

        <div className="shrink-0 px-4 pb-6 pt-3 border-t border-border">
          <Button
            className="w-full rounded-xl"
            disabled={!allAnswered || loading}
            onClick={handleSubmit}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching…
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
