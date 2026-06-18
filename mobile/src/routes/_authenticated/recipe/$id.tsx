import { createFileRoute } from '@tanstack/react-router'
import { RecipeDetailPage } from '@/features/recipes/components/RecipeDetailPage'

export const Route = createFileRoute('/_authenticated/recipe/$id')({
  component: RecipeDetailPage,
})
