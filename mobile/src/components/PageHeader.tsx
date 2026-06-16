import type { LucideIcon } from 'lucide-react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  onBack?: () => void
  icon?: LucideIcon
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, onBack, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("border-b border-border shrink-0", className)}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {onBack && (
          <Button variant="outline" size="icon" className="bg-primary/10 backdrop-blur-md border-primary/20 hover:bg-primary/20 hover:scale-[1.02]" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        {Icon && <Icon className="h-5 w-5 text-foreground" />}
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {actions && <div className="ml-auto">{actions}</div>}
      </div>
    </header>
  )
}
