import { Capacitor } from '@capacitor/core'
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'
import { apiError } from './logger'
import { getToken, setToken } from './storage'
import { capacitorHttpAdapter } from './capacitorHttpAdapter'

let accessToken: string | null = null
let onLogout: (() => void) | null = null

const isNative = Capacitor.isNativePlatform()
const apiUrl = import.meta.env.VITE_API_URL || ''

const api: AxiosInstance = axios.create({
  baseURL: isNative ? apiUrl : '',
  withCredentials: !isNative,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
  ...(isNative && apiUrl ? { adapter: capacitorHttpAdapter } : {}),
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

interface QueueItem {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

let isRefreshing = false
let failedQueue: QueueItem[] = []

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach((item) => {
    if (error) {
      item.reject(error)
    } else if (token) {
      item.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => {
    if (response.data?.success === true) {
      response.data = response.data.data
    }
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (!originalRequest) return Promise.reject(error)

    apiError('ResponseInterceptor', error)

    if (error.response?.status === 401 && !originalRequest._retry) {
      const hadAuth = !!originalRequest.headers?.Authorization
      if (!hadAuth) {
        return Promise.reject(error)
      }

      // Don't retry if the refresh endpoint itself returned 401 — prevents
      // a circular deadlock when the refresh token is invalid/missing.
      if (originalRequest.url?.includes('/v1/auth/refresh')) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`
          }
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await api.post('/v1/auth/refresh', {})
        const newToken: string = data.data?.access_token ?? data.access_token
        accessToken = newToken
        await setToken(newToken)
        processQueue(null, newToken)
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
        return api(originalRequest)
      } catch (refreshError) {
        apiError('RefreshToken', refreshError)
        processQueue(refreshError, null)
        accessToken = null
        await setToken(null)
        onLogout?.()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

function setAccessToken(token: string | null): void {
  accessToken = token
}

function getAccessToken(): string | null {
  return accessToken
}

async function restoreToken(): Promise<boolean> {
  const token = await getToken()
  if (token) {
    accessToken = token
    return true
  }
  return false
}

function setOnLogout(cb: () => void): void {
  onLogout = cb
}

export { api, getAccessToken, restoreToken, setAccessToken, setOnLogout }
