import { execSync } from 'node:child_process'

function tryExec(cmd) {
  try {
    execSync(cmd, { stdio: 'pipe', encoding: 'utf8', timeout: 5000 })
    return true
  } catch {
    return false
  }
}

function getOutput(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', timeout: 5000 }).trim()
  } catch {
    return null
  }
}

export function checkNode() {
  const version = getOutput('node --version')
  if (!version) return { ok: false, message: 'Node.js not found. Install from https://nodejs.org' }
  const major = parseInt(version.replace(/^v/, '').split('.')[0], 10)
  if (major < 22) return { ok: false, message: `Node.js ${version} found. Need >= 22` }
  return { ok: true, message: `Node.js ${version}` }
}

export function checkPnpm() {
  const version = getOutput('pnpm --version')
  if (!version) return { ok: false, message: 'pnpm not found. Install: npm install -g pnpm' }
  return { ok: true, message: `pnpm ${version}` }
}

export function checkUv() {
  const version = getOutput('uv --version')
  if (!version) return { ok: false, message: 'uv not found. Install: https://docs.astral.sh/uv' }
  return { ok: true, message: `uv ${version}` }
}

export function checkMkcert() {
  const ok = tryExec('mkcert -version')
  if (!ok) {
    const plat = getPlatform()
    const tips = {
      macos: 'brew install mkcert',
      linux: 'sudo apt install mkcert || sudo pacman -S mkcert',
      windows: 'winget install mkcert || scoop install mkcert',
    }
    return {
      ok: false,
      message: `mkcert not found (optional). Install: ${tips[plat] || tips.linux}`,
    }
  }
  const version = getOutput('mkcert -version')
  return { ok: true, message: version ? `mkcert ${version}` : 'mkcert available' }
}

export function checkAdb() {
  const ok = tryExec('adb version')
  if (!ok)
    return {
      ok: false,
      message:
        'adb not found. Install Android platform tools (brew install android-platform-tools)',
    }
  return { ok: true, message: 'adb available' }
}

export function checkXcodebuild() {
  if (process.platform !== 'darwin') {
    return { ok: false, message: 'iOS development requires macOS' }
  }
  const version = getOutput('xcodebuild -version')
  if (!version)
    return { ok: false, message: 'xcodebuild not found. Install Xcode from the App Store' }
  return { ok: true, message: `Xcode ${version.split('\n')[0]}` }
}

export function getPlatform() {
  const p = process.platform
  if (p === 'darwin') return 'macos'
  if (p === 'win32') return 'windows'
  if (p === 'linux') return 'linux'
  return p
}
