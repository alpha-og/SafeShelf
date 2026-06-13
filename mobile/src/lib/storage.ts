import { Capacitor } from '@capacitor/core'

const ACCESS_TOKEN_KEY = 'access_token'

let nativeDb: {
  execute: (statements: string) => Promise<unknown>
  query: (statement: string, values?: unknown[]) => Promise<{ values?: unknown[][] }>
  close: () => Promise<void>
} | null = null

async function initNative(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite')
    const sqlite = new SQLiteConnection(CapacitorSQLite)
    const db = await sqlite.createConnection('safeshelf', false, 'no-encryption', 1, false)
    await db.open()
    await db.execute('CREATE TABLE IF NOT EXISTS key_value (key TEXT PRIMARY KEY, value TEXT)')
    nativeDb = {
      execute: (s: string) => db.execute(s),
      query: (s: string, v?: unknown[]) => db.query(s, v),
      close: () => db.close(),
    }
    return true
  } catch {
    return false
  }
}

const initPromise: Promise<boolean> = initNative()

function isBrowser(): boolean {
  return typeof window !== 'undefined' && !Capacitor.isNativePlatform()
}

async function getToken(): Promise<string | null> {
  const native = await initPromise
  if (native && nativeDb) {
    const res = await nativeDb.query('SELECT value FROM key_value WHERE key = ?', [ACCESS_TOKEN_KEY])
    const rows = res.values
    if (rows && rows.length > 0 && rows[0].length > 0) {
      return String(rows[0][0])
    }
    return null
  }
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

async function setToken(value: string | null): Promise<void> {
  const native = await initPromise
  if (native && nativeDb) {
    if (value) {
      await nativeDb.execute(
        `INSERT OR REPLACE INTO key_value (key, value) VALUES ('${ACCESS_TOKEN_KEY}', '${value.replace(/'/g, "''")}')`,
      )
    } else {
      await nativeDb.execute(`DELETE FROM key_value WHERE key = '${ACCESS_TOKEN_KEY}'`)
    }
    return
  }
  if (value) {
    localStorage.setItem(ACCESS_TOKEN_KEY, value)
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  }
}

async function getItem<T>(key: string): Promise<T | null> {
  const native = await initPromise
  if (native && nativeDb) {
    const res = await nativeDb.query('SELECT value FROM key_value WHERE key = ?', [key])
    const rows = res.values
    if (rows && rows.length > 0 && rows[0].length > 0) {
      const raw = String(rows[0][0])
      try {
        return JSON.parse(raw) as T
      } catch {
        return raw as unknown as T
      }
    }
    return null
  }
  const raw = localStorage.getItem(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return raw as unknown as T
  }
}

async function setItem<T>(key: string, value: T): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value)
  const native = await initPromise
  if (native && nativeDb) {
    await nativeDb.execute(
      `INSERT OR REPLACE INTO key_value (key, value) VALUES ('${key.replace(/'/g, "''")}', '${serialized.replace(/'/g, "''")}')`,
    )
    return
  }
  localStorage.setItem(key, serialized)
}

async function removeItem(key: string): Promise<void> {
  const native = await initPromise
  if (native && nativeDb) {
    await nativeDb.execute(`DELETE FROM key_value WHERE key = '${key.replace(/'/g, "''")}'`)
    return
  }
  localStorage.removeItem(key)
}

export { getToken, setToken, getItem, setItem, removeItem }
