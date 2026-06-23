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
          ? 'bg-accent/85 hover:bg-accent hover:scale-[1.02] text-foreground/80 border-accent/80 dark:bg-primary/30 dark:hover:bg-primary/40 dark:border-primary/30'
          : 'bg-accent/60 hover:scale-[1.02] text-foreground/50 border-accent/60 dark:bg-primary/20 dark:border-primary/20'
      }`}
      aria-label="Pick from gallery"
    >
      <Image className="h-5 w-5 sm:h-6 sm:w-6" />
    </button>
  )
}
