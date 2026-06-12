import { useRef } from 'react'
import { motion } from 'framer-motion'
import { TopBar } from './TopBar'
import { ProductSheet } from './ProductSheet'

interface CapturePreviewProps {
  image: string
  isCameraReady: boolean
  onRetake: () => void
}

export function CapturePreview({ image, isCameraReady, onRetake }: CapturePreviewProps) {
  const dismissRef = useRef<(() => void) | null>(null)

  const handleImageTap = () => {
    dismissRef.current?.()
  }

  return (
    <motion.div
      className="fixed inset-0 bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onClick={handleImageTap}
    >
      <img
        src={image}
        alt="Preview"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <TopBar cameraAvailable={isCameraReady} />

      <ProductSheet
        onDismiss={onRetake}
        dismissRef={dismissRef}
      />
    </motion.div>
  )
}
