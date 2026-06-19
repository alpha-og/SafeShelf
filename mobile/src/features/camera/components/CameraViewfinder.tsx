import { AnimatePresence } from 'framer-motion'
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
  /** Notifies the parent when a capture/scan result is on screen, so it can hide
   *  the bottom bar (which would otherwise block the result). */
  onCaptureActiveChange?: (active: boolean) => void
}

export function CameraViewfinder({ mode, onCaptureActiveChange }: CameraViewfinderProps) {
  const { videoRef, error, isCameraReady, capturePhoto, pickFromGallery, stopCamera, startCamera } =
    useCamera()
  const [capturedImage, setCapturedImage] = useState<string | null>(() => scanStore.capturedImage)

  useEffect(() => {
    if (capturedImage) {
      scanStore.capturedImage = capturedImage
      stopCamera()
    }
  }, [capturedImage, stopCamera])

  useEffect(() => {
    onCaptureActiveChange?.(capturedImage !== null)
  }, [capturedImage, onCaptureActiveChange])

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
    <div className="absolute inset-0 w-full h-full bg-background">
      <div
        className={`absolute inset-0 transition-opacity duration-200 ${capturedImage ? 'opacity-0 pointer-events-none' : ''}`}
      >
        <div className="absolute inset-0 bg-black/[0.04]" />
        <CameraPreview videoRef={videoRef} isCameraReady={isCameraReady} error={error} />

        <TopBar cameraAvailable={isCameraReady} />

        <SessionBanner />

        {/* Capture controls sit above the shared bottom bar (which now hosts the
            mode selector), so they're padded clear of it. */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center pb-[calc(7rem+var(--sab))] sm:pb-[calc(8rem+var(--sab))]">
          <div className="flex items-center gap-6 sm:gap-8">
            <GalleryButton onClick={handleGalleryPick} cameraAvailable={isCameraReady} />
            <CaptureButton
              onClick={handleCapture}
              disabled={!isCameraReady}
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
