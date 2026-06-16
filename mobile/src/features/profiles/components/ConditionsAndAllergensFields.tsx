import type { ConstraintItem } from '../services/constraints'
import { SearchableMultiSelect } from './SearchableMultiSelect'

interface ConditionsAndAllergensFieldsProps {
  conditions: ConstraintItem[]
  onConditionsChange: (value: ConstraintItem[]) => void
  allergens: ConstraintItem[]
  onAllergensChange: (value: ConstraintItem[]) => void
}

export function ConditionsAndAllergensFields({
  conditions,
  onConditionsChange,
  allergens,
  onAllergensChange,
}: ConditionsAndAllergensFieldsProps) {
  return (
    <div className="space-y-8">
      <section>
        <SearchableMultiSelect
          label="Medical Conditions"
          kind="condition"
          placeholder="Search conditions…"
          selected={conditions}
          onChange={onConditionsChange}
        />
      </section>

      <section>
        <SearchableMultiSelect
          label="Allergens"
          kind="allergen"
          placeholder="Search allergens…"
          selected={allergens}
          onChange={onAllergensChange}
        />
      </section>
    </div>
  )
}
