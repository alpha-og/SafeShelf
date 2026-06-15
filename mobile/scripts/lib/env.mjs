import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

export function loadEnv(rootDir) {
  const env = {}
  const files = [
    resolve(rootDir, '.env'),
    resolve(rootDir, 'mobile', '.env'),
    resolve(rootDir, 'mobile', '.env.local'),
  ]

  for (const file of files) {
    if (!existsSync(file)) continue
    const content = readFileSync(file, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      let key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      const comment = value.indexOf('#')
      if (comment !== -1) value = value.slice(0, comment).trim()
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      env[key] = value
    }
  }

  return env
}
