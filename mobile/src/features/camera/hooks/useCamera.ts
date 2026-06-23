import { Camera } from '@capacitor/camera'
import { useCallback, useRef, useState } from 'react'

export type ScanMode = 'auto' | 'barcode' | 'image' | 'nutrient-label'

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  error: string | null
  isCameraReady: boolean
  startCamera: () => Promise<void>
  stopCamera: () => void
  capturePhoto: () => Promise<string | null>
  pickFromGallery: () => Promise<string | null>
}

interface CapacitorGlobal {
  Capacitor?: {
    isNativePlatform?: () => boolean
  }
}

function isCapacitorAvailable(): boolean {
  const cap = (window as CapacitorGlobal).Capacitor
  return typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform()
}

interface PhotoOptions {
  source: string
  resultType: string
  quality: number
}

interface PhotoResult {
  dataUrl?: string
}

function pickFromGalleryNative(): Promise<string | null> {
  const capCamera = Camera as unknown as { getPhoto: (opts: PhotoOptions) => Promise<PhotoResult> }
  return capCamera
    .getPhoto({ source: 'PHOTOS', resultType: 'DATA_URL', quality: 80 })
    .then((photo) => photo.dataUrl ?? null)
    .catch(() => null)
}

function pickFromGalleryWeb(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    }
    input.click()
  })
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCameraReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      streamRef.current = mediaStream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
        setIsCameraReady(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access camera')
      setIsCameraReady(false)
    }
  }, [])

  const capturePhoto = useCallback(async (): Promise<string | null> => {
    const video = videoRef.current
    if (!video) return null

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.8)
  }, [])

  const pickFromGallery = useCallback(async (): Promise<string | null> => {
    if (isCapacitorAvailable()) {
      return pickFromGalleryNative()
    }
    return pickFromGalleryWeb()
  }, [])

  return {
    videoRef,
    error,
    isCameraReady,
    startCamera,
    stopCamera,
    capturePhoto,
    pickFromGallery,
  }
}
