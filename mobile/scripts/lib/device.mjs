import { execSync } from 'node:child_process'
import { networkInterfaces } from 'node:os'

export function getLanIp() {
  for (const addrs of Object.values(networkInterfaces())) {
    if (!addrs) continue
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address
      }
    }
  }
  return null
}

export function getConnectedAndroidDevices() {
  try {
    const output = execSync('adb devices', { encoding: 'utf8', timeout: 10000 })
    const lines = output.split('\n').slice(1)
    return lines
      .map((l) => {
        const parts = l.trim().split('\t')
        if (parts.length < 2) return null
        return { id: parts[0], status: parts[1] }
      })
      .filter((d) => d && d.status === 'device')
  } catch {
    return []
  }
}

export function deployToDevice(platform, serverUrl, mobileDir) {
  execSync(`npx cap copy ${platform}`, {
    stdio: 'inherit',
    cwd: mobileDir,
    env: { ...process.env, CAP_SERVER_URL: serverUrl },
  })

  execSync(`npx cap run ${platform}`, {
    stdio: 'inherit',
    cwd: mobileDir,
    env: { ...process.env, CAP_SERVER_URL: serverUrl },
  })
}
