import { useEffect, useState } from 'react'
import type { ScanMode } from './useCamera'
import { decodeBarcode, identifyProduct } from '../services/detection'
import { lookupByBarcode } from '@/features/products/services/product'
import type { ProductInfo } from '@/features/products/services/product'

interface UseProductDetectionReturn {
  isProcessing: boolean
  result: ProductInfo | null
  error: string | null
}

export function useProductDetection(
  imageData: string | null,
  mode: ScanMode,
): UseProductDetectionReturn {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ProductInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!imageData) return

    const data = imageData
    let cancelled = false

    async function process() {
      setIsProcessing(true)
      setResult(null)
      setError(null)

      try {
        if (mode === 'barcode') {
          const barcode = await decodeBarcode(data)
          if (cancelled) return

          if (barcode) {
            console.log(`[scan] Barcode detected: ${barcode}`)
            setResult(await lookupByBarcode(barcode))
          } else {
            console.log('[scan] No barcode detected locally (barcode mode) → sending for backend identification')
            setResult(await identifyProduct(data, mode))
          }
          return
        }

        if (mode === 'auto') {
          const barcode = await decodeBarcode(data)
          if (cancelled) return

          if (barcode) {
            console.log(`[scan] Barcode detected (auto mode): ${barcode}`)
            setResult(await lookupByBarcode(barcode))
          } else {
            console.log('[scan] No barcode detected (auto mode) → sending for image identification')
            setResult(await identifyProduct(data, mode))
          }
          return
        }

        if (mode === 'image') {
          console.log('[scan] Image mode → sending for image identification')
          setResult(await identifyProduct(data, mode))
          return
        }

        if (mode === 'nutrient-label') {
          console.log('[scan] Nutrient label mode → sending for label analysis')
          setResult(await identifyProduct(data, mode))
          return
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Processing failed')
        }
      } finally {
        if (!cancelled) {
          setIsProcessing(false)
        }
      }
    }

    process()

    return () => {
      cancelled = true
    }
  }, [imageData, mode])

  return { isProcessing, result, error }
}
