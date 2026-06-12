interface CaptureButtonProps {
  onClick: () => void
  disabled?: boolean
  cameraAvailable: boolean
}

export function CaptureButton({ onClick, disabled, cameraAvailable }: CaptureButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 flex items-center justify-center disabled:cursor-not-allowed transition-all ${
          cameraAvailable
            ? 'border-foreground shadow-lg shadow-foreground/20 hover:shadow-foreground/30 active:scale-95'
            : 'border-foreground/40'
        }`}
      >
        <div
          className={`rounded-full transition-all ${
            cameraAvailable
              ? 'w-[52px] h-[52px] sm:w-16 sm:h-16 bg-foreground'
              : 'w-[52px] h-[52px] sm:w-16 sm:h-16 bg-foreground/40'
          }`}
        />
    </button>
  )
}
