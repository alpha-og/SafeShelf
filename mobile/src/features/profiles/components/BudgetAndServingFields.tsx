import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { ServingSettings } from '../types'

interface BudgetAndServingFieldsProps {
  budget: string
  onBudgetChange: (value: string) => void
  servingSettings: ServingSettings
  onServingSettingsChange: (value: ServingSettings) => void
}

// NOTE: `budget` / `onBudgetChange` are intentionally kept on the props (and
// still passed by callers) even though the Budget section below is commented
// off — so the field can be switched back on without re-threading state.
export function BudgetAndServingFields({
  servingSettings,
  onServingSettingsChange,
}: BudgetAndServingFieldsProps) {
  return (
    <div className="space-y-8">
      {/* Budget section disabled for now — uncomment to re-enable.
      <section>
        <label htmlFor="budget" className="text-sm font-medium text-foreground mb-2 block">
          Budget
        </label>
        <Input
          id="budget"
          type="text"
          inputMode="numeric"
          value={budget}
          placeholder="e.g. 100"
          onChange={(e) => onBudgetChange(e.target.value.replace(/\D/g, ''))}
        />
      </section>
      */}

      <section>
        <h2 className="text-sm font-medium text-foreground mb-2">Serving size thresholds</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Products with declared serving sizes below these values will be flagged as potentially
          misleading.
        </p>
        <Card className="p-4 space-y-4">
          <div>
            <label htmlFor="min-solid" className="text-xs font-medium text-foreground block mb-1.5">
              Min solid serving (g)
            </label>
            <Input
              id="min-solid"
              type="text"
              inputMode="numeric"
              value={String(servingSettings.minSolidG)}
              onChange={(e) =>
                onServingSettingsChange({
                  ...servingSettings,
                  minSolidG: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0,
                })
              }
            />
          </div>
          <div>
            <label
              htmlFor="min-liquid"
              className="text-xs font-medium text-foreground block mb-1.5"
            >
              Min liquid serving (ml)
            </label>
            <Input
              id="min-liquid"
              type="text"
              inputMode="numeric"
              value={String(servingSettings.minLiquidMl)}
              onChange={(e) =>
                onServingSettingsChange({
                  ...servingSettings,
                  minLiquidMl: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0,
                })
              }
            />
          </div>
        </Card>
      </section>
    </div>
  )
}
