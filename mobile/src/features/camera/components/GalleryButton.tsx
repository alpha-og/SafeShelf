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
            ? 'bg-background/40 hover:bg-background/60 text-foreground border-border'
            : 'bg-background/20 hover:bg-background/30 text-foreground/50 border-border/50'
        }`}
      aria-label="Pick from gallery"
    >
      <Image className="h-5 w-5 sm:h-6 sm:w-6" />
    </button>
  )
}
