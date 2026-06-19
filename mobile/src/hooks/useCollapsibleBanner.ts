import { useCallback, useEffect, useState } from 'react'

export const BANNER_FULL = 224
export const BANNER_COMPACT = 112
const COLLAPSE_THRESHOLD = 150
const EXPAND_THRESHOLD = 80

export function useCollapsibleBanner() {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const el = scrollEl
    if (!el) return

    const handleScroll = () => {
      setCollapsed((prev) => (prev ? el.scrollTop > EXPAND_THRESHOLD : el.scrollTop > COLLAPSE_THRESHOLD))
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [scrollEl])

  const scrollRef = useCallback((el: HTMLDivElement | null) => {
    setScrollEl(el)
  }, [])

  return { scrollRef, collapsed }
}
