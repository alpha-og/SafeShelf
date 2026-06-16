import { api } from '@/lib/axios'

export interface ProductInfo {
  barcode: string | null
  productName: string | null
  brand: string | null
  categories: string[]
  ingredients: string[]
  nutrients: Record<string, unknown>
  allergens: string[]
  imageUrl: string | null
  nutriscoreGrade: string | null
  ecoscoreGrade: string | null
  novaGroup: number | null
  nutrientLevels: Record<string, string>
  labels: string[]
  allergenTraces: string[]
  imageNutritionUrl: string | null
  imageIngredientsUrl: string | null
  quantity: string | null
  servingSize: string | null
}

export function mapResponse(data: Record<string, unknown>): ProductInfo {
  return {
    barcode: (data.barcode as string) ?? null,
    productName: (data.product_name as string) ?? null,
    brand: (data.brand as string) ?? null,
    categories: (data.categories as string[]) ?? [],
    ingredients: (data.ingredients as string[]) ?? [],
    nutrients: (data.nutrients as Record<string, unknown>) ?? {},
    allergens: (data.allergens as string[]) ?? [],
    imageUrl: (data.image_url as string) ?? null,
    nutriscoreGrade: (data.nutriscore_grade as string) ?? null,
    ecoscoreGrade: (data.ecoscore_grade as string) ?? null,
    novaGroup: (data.nova_group as number) ?? null,
    nutrientLevels: (data.nutrient_levels as Record<string, string>) ?? {},
    labels: (data.labels as string[]) ?? [],
    allergenTraces: (data.allergen_traces as string[]) ?? [],
    imageNutritionUrl: (data.image_nutrition_url as string) ?? null,
    imageIngredientsUrl: (data.image_ingredients_url as string) ?? null,
    quantity: (data.quantity as string) ?? null,
    servingSize: (data.serving_size as string) ?? null,
  }
}

export async function lookupByBarcode(barcode: string, storeId?: string | null): Promise<ProductInfo | null> {
  try {
    const url = storeId ? `/v1/stores/${storeId}/inventory/${barcode}` : `/v1/products/${barcode}`
    const response = await api.get(url)
    return mapResponse(response.data)
  } catch (err) {
    console.error('Failed to lookup barcode:', err)
    return null
  }
}
