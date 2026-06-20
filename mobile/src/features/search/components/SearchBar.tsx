import { Search, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface SearchBarProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  autoFocus?: boolean
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search products...',
  autoFocus = false,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  return (
    <div className="relative flex items-center w-full bg-background border border-border/50 rounded-full px-4 py-2.5 shadow-sm transition-colors focus-within:border-primary/50">
      <Search className="w-5 h-5 text-muted-foreground mr-2 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-base h-full"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value.length > 0 && (
        <button
          onClick={() => onChange('')}
          className="ml-2 p-1 rounded-full hover:bg-muted-foreground/20 text-muted-foreground transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
