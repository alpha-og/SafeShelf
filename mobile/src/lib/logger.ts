import type { AxiosError } from 'axios'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const PREFIX = '[SafeShelf]'
const LEVEL_PREFIX: Record<LogLevel, string> = {
  debug: '[DEBUG]',
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERROR]',
}

function log(level: LogLevel, context: string, ...args: unknown[]) {
  const prefix = `${PREFIX}${LEVEL_PREFIX[level]}[${context}]`
  switch (level) {
    case 'debug':
      console.debug(prefix, ...args)
      break
    case 'info':
      console.info(prefix, ...args)
      break
    case 'warn':
      console.warn(prefix, ...args)
      break
    case 'error':
      console.error(prefix, ...args)
      break
  }
}

export function apiError(context: string, error: unknown) {
  const axiosErr = error as AxiosError
  const requestInfo = {
    url: axiosErr.config?.url ?? 'unknown',
    method: axiosErr.config?.method?.toUpperCase() ?? 'UNKNOWN',
    status: axiosErr.response?.status ?? null,
    statusText: axiosErr.response?.statusText ?? null,
    message: axiosErr.message,
    data: axiosErr.response?.data ?? null,
  }
  log('error', `API:${context}`, requestInfo)
}

export function networkError(context: string, error: unknown) {
  log('error', `Network:${context}`, error)
}

export function warn(context: string, ...args: unknown[]) {
  log('warn', context, ...args)
}

export function info(context: string, ...args: unknown[]) {
  log('info', context, ...args)
}
