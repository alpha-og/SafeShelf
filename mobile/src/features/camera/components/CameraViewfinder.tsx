import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useCamera } from '../hooks/useCamera'
import { CameraPreview } from './CameraPreview'
import { CaptureButton } from './CaptureButton'
import { ModeSwitcher } from './ModeSwitcher'
import { TopBar } from './TopBar'
import { GalleryButton } from './GalleryButton'
import { CapturePreview } from './CapturePreview'
import { scanStore } from '../services/scanStore'

export function CameraViewfinder() {
  const { videoRef, mode, error, isCameraReady, capturePhoto, pickFromGallery, setMode, stopCamera, startCamera } = useCamera()
  const [capturedImage, setCapturedImage] = useState<string | null>(() => scanStore.capturedImage)

  useEffect(() => {
    if (capturedImage) {
      scanStore.capturedImage = capturedImage
      stopCamera()
    }
  }, [capturedImage, stopCamera])

  const handleCapture = async () => {
    const photo = await capturePhoto()
    if (photo) setCapturedImage(photo)
  }

  const handleGalleryPick = async () => {
    const photo = await pickFromGallery()
    if (photo) setCapturedImage(photo)
  }

  const handleRetake = () => {
    scanStore.clearAll()
    setCapturedImage(null)
    startCamera()
  }

  return (
    <div className="fixed inset-0 bg-background">
      <div className={`absolute inset-0 transition-opacity duration-200 ${capturedImage ? 'opacity-0 pointer-events-none' : ''}`}>
        <div className="absolute inset-0 bg-black/[0.04]" />
        <CameraPreview videoRef={videoRef} isCameraReady={isCameraReady} error={error} />

        <TopBar cameraAvailable={isCameraReady} />

        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center pb-[calc(2rem_+_env(safe-area-inset-bottom))] sm:pb-[calc(4rem_+_env(safe-area-inset-bottom))] gap-4 sm:gap-6">
          <div className="flex items-center gap-6 sm:gap-8">
            <GalleryButton onClick={handleGalleryPick} cameraAvailable={isCameraReady} />
            <CaptureButton onClick={handleCapture} disabled={!isCameraReady} cameraAvailable={isCameraReady} />
            <div className="w-12 sm:w-14" />
          </div>
          <ModeSwitcher mode={mode} onModeChange={setMode} cameraAvailable={isCameraReady} />
        </div>
      </div>

      <AnimatePresence>
        {capturedImage && (
          <CapturePreview
            image={capturedImage}
            mode={mode}
            isCameraReady={isCameraReady}
            onRetake={handleRetake}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
