import { getItem, setItem } from '@/lib/storage'

const STORAGE_KEY = 'scan_history'
const MAX_ENTRIES = 50

export interface ScanRecord {
  barcode: string
  productName: string | null
  brand: string | null
  imageUrl: string | null
  nutriscoreGrade: string | null
  scannedAt: string
}

export async function addScanToHistory(product: {
  barcode: string | null
  productName: string | null
  brand: string | null
  imageUrl: string | null
  nutriscoreGrade: string | null
}): Promise<void> {
  if (!product.barcode) return

  const history = await getScanHistory()
  const existing = history.findIndex((s) => s.barcode === product.barcode)

  const record: ScanRecord = {
    barcode: product.barcode,
    productName: product.productName ?? null,
    brand: product.brand ?? null,
    imageUrl: product.imageUrl ?? null,
    nutriscoreGrade: product.nutriscoreGrade ?? null,
    scannedAt: new Date().toISOString(),
  }

  if (existing !== -1) {
    history.splice(existing, 1)
  }

  history.unshift(record)

  if (history.length > MAX_ENTRIES) {
    history.length = MAX_ENTRIES
  }

  await setItem(STORAGE_KEY, history)
}

export async function getScanHistory(): Promise<ScanRecord[]> {
  try {
    const data = await getItem<ScanRecord[]>(STORAGE_KEY)
    return data ?? []
  } catch {
    return []
  }
}

export async function clearScanHistory(): Promise<void> {
  await setItem(STORAGE_KEY, [])
}
