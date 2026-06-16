import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { ProductSheet } from '@/features/products/components/ProductSheet'
import type { ScanMode } from '../hooks/useCamera'
import { useProductDetection } from '../hooks/useProductDetection'
import { scanStore } from '../services/scanStore'
import { TopBar } from './TopBar'

interface CapturePreviewProps {
  image: string
  mode: ScanMode
  isCameraReady: boolean
  onRetake: () => void
}

export function CapturePreview({ image, mode, isCameraReady, onRetake }: CapturePreviewProps) {
  const { isProcessing, result, error } = useProductDetection(image, mode)
  const dismissRef = useRef<(() => void) | null>(null)
  const topBarRef = useRef<HTMLDivElement>(null)
  const [topBarHeight, setTopBarHeight] = useState(0)

  useEffect(() => {
    if (topBarRef.current) {
      setTopBarHeight(topBarRef.current.offsetHeight)
    }
  }, [])

  useEffect(() => {
    if (result) {
      scanStore.lastResult = result
    }
  }, [result])

  const handleImageTap = () => {
    dismissRef.current?.()
  }

  return (
    <motion.div
      className="fixed inset-0 bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <img
        src={image}
        alt="Preview"
        className="absolute inset-0 w-full h-full object-cover"
        onClick={handleImageTap}
      />

      <TopBar ref={topBarRef} cameraAvailable={isCameraReady} />

      <ProductSheet
        isProcessing={isProcessing}
        result={result}
        error={error}
        onDismiss={onRetake}
        dismissRef={dismissRef}
        topOffset={topBarHeight}
      />
    </motion.div>
  )
}
