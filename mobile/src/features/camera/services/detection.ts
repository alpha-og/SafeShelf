import { BarcodeDetector, type BarcodeFormat } from 'barcode-detector/ponyfill'
import { api } from '@/lib/axios'

type ScanMode = 'auto' | 'barcode' | 'image' | 'nutrient-label'

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

const BARCODE_FORMATS: BarcodeFormat[] = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'itf',
  'qr_code',
  'data_matrix',
  'pdf417',
  'aztec',
  'databar',
  'databar_expanded',
]

let detector: BarcodeDetector | null = null

function getDetector(): BarcodeDetector {
  if (!detector) {
    detector = new BarcodeDetector({ formats: BARCODE_FORMATS })
  }
  return detector
}

function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to decode image'))
    img.src = dataUrl
  })
}

export async function decodeBarcode(imageData: string): Promise<string | null> {
  try {
    const img = await dataUrlToImage(imageData)
    const barcodes = await getDetector().detect(img)
    if (barcodes.length > 0) {
      return barcodes[0].rawValue
    }
    return null
  } catch {
    return null
  }
}

function mapResponse(data: Record<string, unknown>): ProductInfo {
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

export async function lookupByBarcode(barcode: string): Promise<ProductInfo | null> {
  try {
    const response = await api.get(`/v1/products/${barcode}`)
    return mapResponse(response.data)
  } catch (err) {
    console.error('Failed to lookup barcode:', err)
    return null
  }
}

export async function identifyProduct(imageData: string, mode: ScanMode): Promise<ProductInfo | null> {
  try {
    const response = await api.post('/v1/products/identify', {
      image: imageData,
      text: mode,
    })
    const data = response.data.product
    if (!data) {
      throw new Error('Product not found or barcode not readable')
    }
    return mapResponse(data)
  } catch (err: any) {
    console.error('Failed to identify product:', err)
    throw new Error(err.response?.data?.detail || 'Failed to identify product from image')
  }
}
