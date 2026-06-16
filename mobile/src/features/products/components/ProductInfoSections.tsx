import { BadgeListSection } from './BadgeListSection'

interface ProductInfoSectionsProps {
  categories: string[]
  allergens: string[]
  allergenTraces: string[]
  ingredients: string[]
}

export function ProductInfoSections({
  categories,
  allergens,
  allergenTraces,
  ingredients,
}: ProductInfoSectionsProps) {
  return (
    <>
      <BadgeListSection
        heading="Categories"
        items={categories}
        className="bg-muted/30 text-muted-foreground border-border hover:scale-105"
      />
      <BadgeListSection
        heading="Allergens"
        items={allergens}
        className="bg-destructive/10 text-destructive border-destructive/20 hover:scale-105"
      />
      <BadgeListSection
        heading="May Contain Traces"
        items={allergenTraces}
        className="bg-accent/10 text-accent-foreground border-accent/20 hover:scale-105"
      />
      <BadgeListSection
        heading={`Ingredients (${ingredients.length})`}
        items={ingredients}
        className="bg-muted/30 text-muted-foreground border-border hover:scale-105"
      />
    </>
  )
}
