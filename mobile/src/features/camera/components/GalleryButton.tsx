import { Image } from 'lucide-react'

interface GalleryButtonProps {
  onClick: () => void
  cameraAvailable: boolean
}

export function GalleryButton({ onClick, cameraAvailable }: GalleryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-md border transition-colors ${
        cameraAvailable
          ? 'bg-black/40 hover:bg-black/60 text-white border-white/15'
          : 'bg-black/20 hover:bg-black/30 text-white/50 border-white/8'
      }`}
      aria-label="Pick from gallery"
    >
      <Image className="h-5 w-5 sm:h-6 sm:w-6" />
    </button>
  )
}
