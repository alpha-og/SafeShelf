import { api } from '@/lib/axios'
import type { HealthReportSummary, HealthReportUploadResponse } from '../types'

export async function uploadHealthReport(file: File): Promise<HealthReportUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post<HealthReportUploadResponse>(
    '/v1/health-report/upload',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )

  return response.data
}

export async function fetchHealthReports(): Promise<HealthReportSummary[]> {
  const response = await api.get<HealthReportSummary[]>('/v1/health-report/')
  return response.data
}
