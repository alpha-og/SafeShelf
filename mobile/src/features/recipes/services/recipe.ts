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
  author_name: string | null
  source: string | null
  servings: number | null
  is_ai_generated?: boolean
}

export interface AdjustedIngredient {
  ingredient: string
  original_measurement: string
  adjusted_measurement: string
  note: string | null
}

export interface RecipeQuantitiesRequest {
  ingredients: string[]
  measurements: string[]
  original_servings: number | null
  desired_servings: number
  dietary_preferences: string[]
  conditions: string[]
  allergens: string[]
  recipe_name?: string
}

export interface RecipeQuantitiesResponse {
  recipe_id: string
  recipe_name: string
  desired_servings: number
  ingredients: AdjustedIngredient[]
}

export interface ClarificationField {
  id: string
  label: string
  description?: string | null
  schema?: Record<string, unknown> | null
}

export interface SearchResponse {
  success: boolean
  status?: 'results' | 'clarification_needed' | 'rejected'
  recipes: RecipeItem[]
  total: number
  page: number
  page_size: number
  error?: string | null
  rejected?: boolean
  rejection_reason?: string | null
  session_id?: string | null
  clarifications?: ClarificationField[] | null
  ai_generation_error?: string | null
}

export interface ClarifyResponse {
  success: boolean
  status: 'results' | 'clarification_needed' | 'rejected'
  recipes: RecipeItem[]
  total: number
  session_id?: string | null
  clarifications?: ClarificationField[] | null
  error?: string | null
  rejection_reason?: string | null
}

export interface ProductVariant {
  barcode: string
  product_name: string
  product_image: string | null
  brand: string | null
  quantity: string | null
  price: number
  in_stock: boolean
}

export interface IngredientMapping {
  ingredient: string
  options: ProductVariant[]
}

export interface RecipeProductsResponse {
  recipe_id: string
  recipe_name: string
  mappings: IngredientMapping[]
}

export async function getRecipeById(id: string): Promise<RecipeItem> {
  const { data } = await api.get(`/v1/recipes/${id}`)
  return data as RecipeItem
}

export async function getRecipeProducts(
  id: string,
  storeId: string,
): Promise<RecipeProductsResponse> {
  const { data } = await api.get(`/v1/recipes/${id}/products`, {
    params: { store_id: storeId },
  })
  return data as RecipeProductsResponse
}

export async function searchRecipes(
  query: string,
  categories: string[],
  areas: string[],
  page: number,
  generateAiRecipe: boolean = false,
): Promise<SearchResponse> {
  const { data } = await api.post('/v1/recipes/search', {
    query,
    categories,
    areas,
    page,
    page_size: 10,
    generate_ai_recipe: generateAiRecipe,
  })
  return data as SearchResponse
}

export async function clarifyRecipes(
  sessionId: string,
  answers: Record<string, unknown>,
): Promise<ClarifyResponse> {
  const { data } = await api.post('/v1/recipes/clarify', {
    session_id: sessionId,
    answers,
  })
  return data as ClarifyResponse
}

export async function getRecipeFeed(
  page: number,
  pageSize: number = 10,
): Promise<SearchResponse> {
  const { data } = await api.get('/v1/recipes/feed', {
    params: { page, page_size: pageSize },
  })
  return data as SearchResponse
}

export async function getRecipeQuantities(
  id: string,
  req: RecipeQuantitiesRequest,
): Promise<RecipeQuantitiesResponse> {
  const { data } = await api.post(`/v1/recipes/${id}/quantities`, req)
  return data as RecipeQuantitiesResponse
}
