import { createFileRoute } from '@tanstack/react-router'
import { ProductDetailPage } from '@/features/camera/components/ProductDetailPage'

export const Route = createFileRoute('/_authenticated/product/$barcode')({
  component: ProductDetailPage,
})
