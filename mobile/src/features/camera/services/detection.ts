import { BarcodeDetector, type BarcodeFormat } from 'barcode-detector/ponyfill'
import { api } from '@/lib/axios'
import { mapResponse, type ProductInfo } from '@/features/products/services/product'

type ScanMode = 'auto' | 'barcode' | 'image' | 'nutrient-label'

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
