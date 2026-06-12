import { createFileRoute } from '@tanstack/react-router'
import { CameraViewfinder } from '@/features/camera/components/CameraViewfinder'

export const Route = createFileRoute('/_authenticated/')({
  component: CameraViewfinder,
})
