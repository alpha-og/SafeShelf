import { FileText, Image, Scan, ScanLine, type LucideIcon } from 'lucide-react'
import type { ScanMode } from './hooks/useCamera'

export interface ScanModeOption {
  value: ScanMode
  label: string
  icon: LucideIcon
}

/** The scan modes offered in the camera mode selector, in display order. */
export const SCAN_MODES: ScanModeOption[] = [
  { value: 'auto', label: 'Auto', icon: Scan },
  { value: 'barcode', label: 'Barcode', icon: ScanLine },
  { value: 'image', label: 'Image', icon: Image },
  { value: 'nutrient-label', label: 'Nutrient', icon: FileText },
]
