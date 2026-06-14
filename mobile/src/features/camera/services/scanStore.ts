import type { ProductInfo } from './detection'

interface ScanStore {
  capturedImage: string | null
  lastResult: ProductInfo | null
}

const store: ScanStore = {
  capturedImage: null,
  lastResult: null,
}

export const scanStore = {
  get capturedImage() { return store.capturedImage },
  set capturedImage(val: string | null) { store.capturedImage = val },
  get lastResult() { return store.lastResult },
  set lastResult(val: ProductInfo | null) { store.lastResult = val },
  clearAll() {
    store.capturedImage = null
    store.lastResult = null
  },
}
