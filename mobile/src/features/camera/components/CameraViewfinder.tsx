import { useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { CameraPreview } from './CameraPreview'
import { CaptureButton } from './CaptureButton'
import { ModeSwitcher } from './ModeSwitcher'
import { TopBar } from './TopBar'
import { GalleryButton } from './GalleryButton'
import { CapturePreview } from './CapturePreview'

export function CameraViewfinder() {
  const { videoRef, mode, error, isCameraReady, capturePhoto, pickFromGallery, setMode } = useCamera()
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const handleCapture = async () => {
    const photo = await capturePhoto()
    if (photo) setCapturedImage(photo)
  }

  const handleGalleryPick = async () => {
    const photo = await pickFromGallery()
    if (photo) setCapturedImage(photo)
  }

  const handleRetake = () => {
    setCapturedImage(null)
  }

  if (capturedImage) {
    return (
      <CapturePreview
        image={capturedImage}
        isCameraReady={isCameraReady}
        onRetake={handleRetake}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-neutral-950">
      <CameraPreview videoRef={videoRef} isCameraReady={isCameraReady} error={error} />

      <TopBar cameraAvailable={isCameraReady} />

      <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center pb-8 sm:pb-16 gap-4 sm:gap-6">
        <div className="flex items-center gap-6 sm:gap-8">
          <GalleryButton onClick={handleGalleryPick} cameraAvailable={isCameraReady} />
          <CaptureButton onClick={handleCapture} disabled={!isCameraReady} cameraAvailable={isCameraReady} />
          <div className="w-12 sm:w-14" />
        </div>
        <ModeSwitcher mode={mode} onModeChange={setMode} cameraAvailable={isCameraReady} />
      </div>
    </div>
  )
}
