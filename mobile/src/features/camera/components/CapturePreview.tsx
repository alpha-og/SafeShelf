import { TopBar } from './TopBar'
import { ProductSheet } from './ProductSheet'

interface CapturePreviewProps {
  image: string
  isCameraReady: boolean
  onRetake: () => void
}

export function CapturePreview({ image, isCameraReady, onRetake }: CapturePreviewProps) {
  return (
    <div className="fixed inset-0 bg-neutral-950">
      <img
        src={image}
        alt="Preview"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <TopBar cameraAvailable={isCameraReady} />

      <ProductSheet onRetake={onRetake} cameraAvailable={isCameraReady} />
    </div>
  )
}
