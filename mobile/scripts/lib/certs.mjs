import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { divider, info, success, table, warn } from './logger.mjs'

export function isMkcertInstalled() {
  try {
    execSync('mkcert -version', { stdio: 'pipe', timeout: 5000 })
    return true
  } catch {
    return false
  }
}

export function getCARoot() {
  try {
    return execSync('mkcert -CAROOT', { encoding: 'utf8', timeout: 5000 }).trim()
  } catch {
    return null
  }
}

export function installCA() {
  info('Installing mkcert CA into system trust store...')
  execSync('mkcert -install', { stdio: 'inherit' })
  success('mkcert CA installed')
}

export function generateCert(certDir, hostnames) {
  mkdirSync(certDir, { recursive: true })
  const certFile = resolve(certDir, 'hostname.local+2.pem')
  const keyFile = resolve(certDir, 'hostname.local+2-key.pem')
  const args = [`-cert-file "${certFile}"`, `-key-file "${keyFile}"`, ...hostnames]
  execSync(`mkcert ${args.join(' ')}`, { stdio: 'inherit' })
}

export function certExists(certDir) {
  return (
    existsSync(resolve(certDir, 'hostname.local+2.pem')) &&
    existsSync(resolve(certDir, 'hostname.local+2-key.pem'))
  )
}

export function getCertInfo(certDir) {
  const certFile = resolve(certDir, 'hostname.local+2.pem')
  if (!existsSync(certFile)) return null

  try {
    const output = execSync(`openssl x509 -in "${certFile}" -text -noout 2>&1`, {
      encoding: 'utf8',
      timeout: 5000,
    })

    const sanMatch = output.match(/X509v3 Subject Alternative Name:\s*\n\s+(.+)/)
    const sans = sanMatch ? sanMatch[1].split(', ').map((s) => s.trim()) : ['(unknown)']

    const expMatch = output.match(/Not After\s*:\s*(.+)/)
    const expiry = expMatch ? new Date(expMatch[1].trim()).toLocaleDateString() : '(unknown)'

    return { sans, expiry }
  } catch {
    return null
  }
}

export function ensureCerts(certDir, tlsEnabled, certsMode, ip) {
  if (!tlsEnabled) {
    warn('TLS disabled via MOBILE_TLS_ENABLED=false. Dev server will use HTTP.')
    warn('Camera and other secure-context features will NOT work on device.')
    return 'http'
  }

  if (certsMode === 'skip') {
    warn('DEV_CERTS_MODE=skip: using auto-generated self-signed cert from basicSsl plugin.')
    warn('Android WebView will likely reject this cert. Either:')
    warn('  - Set DEV_CERTS_MODE=auto and install mkcert')
    warn('  - Or manually install the basicSsl cert on your device')
    return 'https'
  }

  if (!isMkcertInstalled()) {
    warn('mkcert not found. Using auto-generated self-signed cert.')
    warn('Android WebView needs mkcert for trusted HTTPS. Install:')
    const plat = process.platform
    if (plat === 'darwin') warn('  brew install mkcert && mkcert -install')
    else if (plat === 'linux') warn('  sudo apt install mkcert && mkcert -install')
    else warn('  See https://github.com/FiloSottile/mkcert')
    return 'https'
  }

  const hostnames = ['hostname.local', 'localhost', '127.0.0.1']
  if (ip) hostnames.push(ip)

  const existing = getCertInfo(certDir)
  const ipInCert = existing && ip ? existing.sans.some((s) => s.includes(ip)) : false

  if (existing && ipInCert && certExists(certDir)) {
    info('SSL certificate is up to date.')
  } else {
    if (existing && !ipInCert && ip) {
      info('Network IP changed. Regenerating certificate...')
    } else if (!existing) {
      info('Generating SSL certificate...')
    }
    generateCert(certDir, hostnames)
  }

  const certInfo = getCertInfo(certDir)
  if (certInfo) {
    table([
      { label: 'SANs', status: 'info', detail: certInfo.sans.join(', ') },
      { label: 'Expires', status: 'info', detail: certInfo.expiry },
    ])
  }

  divider()
  warn('Self-signed certificate in use. Not suitable for production.')
  divider()

  return 'https'
}
