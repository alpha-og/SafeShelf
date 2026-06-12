import { Camera } from 'lucide-react'
import type { RefObject } from 'react'

interface CameraPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>
  isCameraReady: boolean
  error: string | null
}

export function CameraPreview({ videoRef, isCameraReady, error }: CameraPreviewProps) {
  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <Camera className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center px-4">{error}</p>
      </div>
    )
  }

  return (
    <>
      <video
        ref={videoRef}
        playsInline
        muted
        autoFocus
        className="absolute inset-0 w-full h-full object-cover"
      />
      {!isCameraReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Camera className="h-12 w-12 text-muted-foreground animate-pulse" />
        </div>
      )}
    </>
  )
}
