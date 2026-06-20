import { useNavigate } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const navigate = useNavigate()

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="rounded-full bg-background border border-border p-4 mb-5">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-1.5">{title}</h2>
      <p className="text-sm text-muted-foreground text-center max-w-sm">{description}</p>
      {actionLabel && (
        <Button
          onClick={onAction ?? (() => navigate({ to: '/' }))}
          className="mt-6 hover:scale-[1.02]"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
