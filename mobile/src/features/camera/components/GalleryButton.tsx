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
          ? 'bg-primary/55 hover:bg-primary/65 hover:scale-[1.02] text-white border-primary/50'
          : 'bg-primary/40 hover:scale-[1.02] text-white/70 border-primary/40'
      }`}
      aria-label="Pick from gallery"
    >
      <Image className="h-5 w-5 sm:h-6 sm:w-6" />
    </button>
  )
}
