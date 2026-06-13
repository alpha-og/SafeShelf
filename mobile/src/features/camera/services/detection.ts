import { BarcodeDetector, type BarcodeFormat } from 'barcode-detector/ponyfill'

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

export async function lookupByBarcode(barcode: string): Promise<ProductInfo | null> {
  console.log(`[stub] GET /v1/products/${barcode}`)
  console.log(`[stub]   → would fetch product info for barcode "${barcode}"`)
  return null
}

export async function identifyProduct(imageData: string, mode: ScanMode): Promise<ProductInfo | null> {
  console.log(`[stub] POST /v1/products/identify`)
  console.log(`[stub]   → mode: "${mode}"`)
  console.log(`[stub]   → image: ${imageData.slice(0, 64)}... (${imageData.length} chars)`)
  return null
}
