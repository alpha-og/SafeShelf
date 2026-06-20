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
          ? 'border-white/50 shadow-xl shadow-primary/40 hover:shadow-primary/50 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95'
          : 'border-white/30 shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:-translate-y-0.5'
      }`}
    >
      <div
        className={`rounded-full transition-all ${
          cameraAvailable
            ? 'w-[52px] h-[52px] sm:w-16 sm:h-16 bg-[#2563eb]'
            : 'w-[52px] h-[52px] sm:w-16 sm:h-16 bg-primary/80'
        }`}
      />
    </button>
  )
}
