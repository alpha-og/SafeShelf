import { Loader2, Plus, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConstraintSearch } from '../hooks/useConstraintSearch'
import type { ConstraintItem, ConstraintKind } from '../services/constraints'

interface SearchableMultiSelectProps {
  label: string
  kind: ConstraintKind
  placeholder: string
  selected: ConstraintItem[]
  onChange: (selected: ConstraintItem[]) => void
}

export function SearchableMultiSelect({
  label,
  kind,
  placeholder,
  selected,
  onChange,
}: SearchableMultiSelectProps) {
  const [query, setQuery] = useState('')
  // The term that has actually been submitted for search. The API is only hit
  // for this value — never on keystroke — so typing alone does nothing.
  const [submitted, setSubmitted] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data, isFetching } = useConstraintSearch(kind, submitted, open)

  // Close the results list when tapping outside.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const selectedIds = new Set(selected.map((s) => s.id))
  const results = (data ?? []).filter((item) => !selectedIds.has(item.id))

  // Only surface the dropdown once a search has actually been submitted.
  const showDropdown = open && submitted.trim().length > 0

  function search() {
    const term = query.trim()
    if (!term) return
    setSubmitted(term)
    setOpen(true)
  }

  function add(item: ConstraintItem) {
    onChange([...selected, item])
    setQuery('')
    setSubmitted('')
  }

  function remove(id: string) {
    onChange(selected.filter((s) => s.id !== id))
  }

  return (
    <div ref={containerRef}>
      <label className="text-sm font-medium text-foreground mb-2 block">{label}</label>

      <div className="relative">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            search()
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              placeholder={placeholder}
              className="pl-9"
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
            />
          </div>
          <Button type="submit" disabled={!query.trim()}>
            Search
          </Button>
        </form>

        {showDropdown && (
          <div className="absolute z-10 mt-1 w-full rounded-2xl border border-border bg-popover shadow-md overflow-hidden">
            {isFetching ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </div>
            ) : results.length > 0 ? (
              <ul className="max-h-56 overflow-y-auto overflow-x-hidden py-1 no-scrollbar">
                {results.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => add(item)}
                      className="group w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground text-left transition-colors hover:bg-primary/[0.12] hover:scale-[1.02] rounded-xl"
                    >
                      <span className="flex-1">{item.name}</span>
                      <Plus className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                No matches for “{submitted}”
              </div>
            )}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary border border-primary/40 pl-3 pr-1.5 py-1 text-sm"
            >
              {item.name}
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`Remove ${item.name}`}
                className="rounded-full p-0.5 transition-colors hover:bg-background/50 hover:scale-105"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
