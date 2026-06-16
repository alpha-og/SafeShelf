type SuccessApiResponse<T, M extends { timestamp: string } = { timestamp: string }> = {
  success: true
  data: T
  metadata: M
}

type ErrorApiResponse = {
  success: false
  type: string
  title: string
  status: number
  detail: string
  instance: string
}

type ApiResponse<T, M extends { timestamp: string } = { timestamp: string }> =
  | SuccessApiResponse<T, M>
  | ErrorApiResponse

export type { ApiResponse, ErrorApiResponse, SuccessApiResponse }
