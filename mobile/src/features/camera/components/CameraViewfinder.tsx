import { AnimatePresence } from 'framer-motion'
import { CameraIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SessionBanner } from '@/features/cart/components/SessionBanner'
import { useCamera } from '../hooks/useCamera'
import type { ScanMode } from '../hooks/useCamera'
import { scanStore } from '../services/scanStore'
import { CameraPreview } from './CameraPreview'
import { CaptureButton } from './CaptureButton'
import { CapturePreview } from './CapturePreview'
import { GalleryButton } from './GalleryButton'
import { TopBar } from './TopBar'

interface CameraViewfinderProps {
  /** Active scan mode, owned by the bottom bar so it and the viewfinder stay in sync. */
  mode: ScanMode
  /** Notifies the parent when a scan result is on screen, so it can bump the
   *  camera tab's z-index above the bottom bar. */
  onCaptureActiveChange?: (active: boolean) => void
  /** Current tab index — camera auto-stops when not on the camera tab. */
  activeTab: number
}

const CAMERA_TAB = 1

export function CameraViewfinder({ mode, onCaptureActiveChange, activeTab }: CameraViewfinderProps) {
  const { videoRef, error, isCameraReady, capturePhoto, pickFromGallery, stopCamera, startCamera } =
    useCamera()
  const [capturedImage, setCapturedImage] = useState<string | null>(() => scanStore.capturedImage)
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    if (capturedImage) {
      scanStore.capturedImage = capturedImage
      stopCamera()
    }
  }, [capturedImage, stopCamera])

  // Stop camera when the user swipes away from the camera tab.
  useEffect(() => {
    if (activeTab !== CAMERA_TAB) {
      stopCamera()
    }
  }, [activeTab, stopCamera])

  useEffect(() => {
    onCaptureActiveChange?.(capturedImage !== null)
  }, [capturedImage, onCaptureActiveChange])

  const handleCapture = async () => {
    if (isCameraReady) {
      const photo = await capturePhoto()
      if (photo) setCapturedImage(photo)
    } else {
      setIsStarting(true)
      await startCamera()
      setIsStarting(false)
    }
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

  const isIdle = !isCameraReady && !error && !capturedImage

  return (
    <div className="absolute inset-0 w-full h-full bg-background">
      <div
        className={`absolute inset-0 transition-opacity duration-200 ${capturedImage ? 'opacity-0 pointer-events-none' : ''}`}
      >
        {isIdle && !isStarting ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <CameraIcon className="h-16 w-16 text-foreground/30" />
            <p className="text-xl font-bold text-foreground">Camera is OFF</p>
            <p className="text-sm text-foreground/50 text-center px-8">
              Tap on shutter to turn on camera
            </p>
          </div>
        ) : (
          <CameraPreview videoRef={videoRef} isCameraReady={isCameraReady} error={error} />
        )}

        <TopBar cameraAvailable={isCameraReady} />

        <SessionBanner />

        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center pb-[calc(7rem+var(--sab))] sm:pb-[calc(8rem+var(--sab))]">
          <div className="flex items-center gap-6 sm:gap-8">
            <GalleryButton onClick={handleGalleryPick} cameraAvailable={isCameraReady} />
            <CaptureButton
              onClick={handleCapture}
              disabled={isStarting}
              cameraAvailable={isCameraReady}
            />
            <div className="w-12 sm:w-14" />
          </div>
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
