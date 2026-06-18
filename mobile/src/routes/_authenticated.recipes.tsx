import { createFileRoute } from '@tanstack/react-router'
import { RecipesPage } from '@/features/recipes/components/RecipesPage'

export const Route = createFileRoute('/_authenticated/recipes')({
  component: RecipesPage,
})
