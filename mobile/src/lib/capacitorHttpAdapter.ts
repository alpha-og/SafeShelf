import { CapacitorHttp } from '@capacitor/core'
import { AxiosError } from 'axios'
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
    const src = config.headers as { toJSON?: () => Record<string, unknown> }
    const raw: Record<string, unknown> =
      typeof src.toJSON === 'function' ? src.toJSON() : (src as Record<string, unknown>)
    const skip = new Set(['common', 'delete', 'get', 'head', 'post', 'put', 'patch'])
    for (const key of Object.keys(raw)) {
      if (!skip.has(key) && typeof raw[key] === 'string') {
        headers[key] = raw[key] as string
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

    const status = axiosResponse.status
    if (status < 200 || status >= 300) {
      throw new AxiosError(
        `Request failed with status code ${status}`,
        AxiosError.ERR_BAD_RESPONSE,
        config,
        undefined,
        axiosResponse,
      )
    }

    return axiosResponse
  } catch (err) {
    console.error('[capacitor-http] error', err)
    throw err
  }
}
