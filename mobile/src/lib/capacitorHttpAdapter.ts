import { CapacitorHttp } from '@capacitor/core'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

function buildUrl(config: InternalAxiosRequestConfig): string {
  const base = config.baseURL || ''
  const path = config.url || ''
  if (!base) return path
  const joined = base.endsWith('/') || path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
  return joined
}

export const capacitorHttpAdapter: AxiosAdapter = async (config) => {
  const url = buildUrl(config)

  const headers: Record<string, string> = {}
  if (config.headers && typeof config.headers === 'object') {
    const h = config.headers as Record<string, unknown>
    for (const key of Object.keys(h)) {
      if (key !== 'common' && key !== 'delete' && key !== 'get' && key !== 'head' &&
          key !== 'post' && key !== 'put' && key !== 'patch' && typeof h[key] === 'string') {
        headers[key] = h[key] as string
      }
    }
  }

  let data = config.data
  if (data && typeof data === 'object' && typeof data !== 'string' && !(data instanceof FormData)) {
    data = JSON.stringify(data)
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }
  }

  try {
    const response = await CapacitorHttp.request({
      url,
      method: (config.method?.toUpperCase() || 'GET') as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      headers,
      data,
      params: config.params as Record<string, string>,
      connectTimeout: typeof config.timeout === 'number' && config.timeout > 0 ? config.timeout : 30_000,
      readTimeout: typeof config.timeout === 'number' && config.timeout > 0 ? config.timeout : 30_000,
    })

    const axiosResponse: AxiosResponse = {
      data: response.data,
      status: response.status,
      statusText: String(response.status),
      headers: response.headers as Record<string, string>,
      config,
    }

    return axiosResponse
  } catch (err) {
    console.error('[capacitor-http] error', err)
    throw err
  }
}
