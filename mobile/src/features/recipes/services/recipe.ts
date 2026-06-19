import { api } from '@/lib/axios'

export interface RecipeItem {
  id: string
  name: string
  category: string | null
  area: string | null
  ingredients: string[]
  measurements: string[]
  instructions: string
  thumbnail_url: string | null
  tags: string[]
  youtube_url: string | null
  source_url: string | null
}

export interface SearchResponse {
  success: boolean
  recipes: RecipeItem[]
  total: number
  page: number
  page_size: number
  error?: string | null
  rejected?: boolean
  rejection_reason?: string | null
}

export async function getRecipeById(id: string): Promise<RecipeItem> {
  const { data } = await api.get(`/v1/recipes/${id}`)
  return data as RecipeItem
}

export async function searchRecipes(
  query: string,
  categories: string[],
  areas: string[],
  page: number,
): Promise<SearchResponse> {
  const { data } = await api.post('/v1/recipes/search', {
    query,
    categories,
    areas,
    page,
    page_size: 10,
  })
  return data as SearchResponse
}
