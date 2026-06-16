#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ensureCerts,
  generateCert,
  getCARoot,
  getCertInfo,
  installCA,
  isMkcertInstalled,
} from './lib/certs.mjs'
import { deployToDevice, getConnectedAndroidDevices, getLanIp } from './lib/device.mjs'
import { loadEnv } from './lib/env.mjs'
import { divider, error, header, info, success, table, warn } from './lib/logger.mjs'
import {
  checkAdb,
  checkMkcert,
  checkNode,
  checkPnpm,
  checkUv,
  checkXcodebuild,
  getPlatform,
} from './lib/system.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..', '..')
const mobileDir = resolve(projectRoot, 'mobile')
const backendDir = resolve(projectRoot, 'backend')
const certDir = resolve(projectRoot, 'mobile', 'dev-certs')

const env = loadEnv(projectRoot)
const tlsEnabled = env.MOBILE_TLS_ENABLED !== 'false'
const certsMode = (env.DEV_CERTS_MODE || 'auto').toLowerCase()
const port = Number(env.MOBILE_PORT) || 8826

main()

function main() {
  const cmd = process.argv[2]
  switch (cmd) {
    case 'setup':
      return cmdSetup()
    case 'android':
      return cmdRun('android')
    case 'ios':
      return cmdRun('ios')
    default:
      showHelp()
  }
}

function showHelp() {
  header('SafeShelf Dev Script')
  divider()
  info('Usage: node scripts/dev.mjs <command>')
  divider()
  table([
    { label: 'setup', status: '', detail: 'Check environment, install deps, set up SSL certs' },
    { label: 'android', status: '', detail: 'Build and deploy to Android device' },
    { label: 'ios', status: '', detail: 'Build and deploy to iOS device' },
  ])
  divider()
  info('Configuration via .env files (root .env -> mobile .env -> mobile .env.local):')
  table([
    { label: 'MOBILE_TLS_ENABLED', status: 'default: true', detail: 'Set to false to use HTTP' },
    {
      label: 'DEV_CERTS_MODE',
      status: 'default: auto',
      detail: 'skip=no mkcert, auto=mkcert if available',
    },
    { label: 'MOBILE_PORT', status: 'default: 8826', detail: 'Dev server port' },
  ])
}

function cmdSetup() {
  header('SafeShelf Dev Setup')

  const platform = getPlatform()
  info(`Platform: ${platform}`)
  divider()

  const prereqs = [checkNode(), checkPnpm(), checkUv(), checkMkcert()]
  const allOk = prereqs.every((p) => p.ok)

  table(
    prereqs.map((p) => ({
      label: p.message.split('\n')[0],
      status: p.ok ? 'ok' : 'fail',
    })),
  )

  if (!allOk) {
    divider()
    error('Some prerequisites are missing. Fix the issues above and re-run:')
    info('  node scripts/dev.mjs setup')
    process.exit(1)
  }

  divider()
  info('Installing project dependencies...')
  execSync('pnpm install', { stdio: 'inherit', cwd: projectRoot })
  execSync('uv sync', { stdio: 'inherit', cwd: backendDir })
  success('Dependencies installed')

  divider()
  handleCertsForSetup()

  divider()
  success('Setup complete')
  divider()
  info('Next steps:')
  table([
    { label: 'pnpm dev', status: '', detail: 'Start all dev servers' },
    { label: 'node mobile/scripts/dev.mjs android', status: '', detail: 'Run on Android device' },
    { label: 'node mobile/scripts/dev.mjs ios', status: '', detail: 'Run on iOS device' },
  ])
}

function handleCertsForSetup() {
  if (!tlsEnabled) {
    warn('TLS is disabled (MOBILE_TLS_ENABLED=false). Dev server will use HTTP.')
    warn('Camera and other secure-context features will NOT work on device.')
    return
  }

  if (certsMode === 'skip') {
    warn('DEV_CERTS_MODE=skip: SSL cert setup skipped.')
    warn('Dev server will fall back to basicSsl auto-generated self-signed certs.')
    warn(
      'Android WebView will likely reject these. Set DEV_CERTS_MODE=auto and install mkcert for trusted HTTPS.',
    )
    return
  }

  if (!isMkcertInstalled()) {
    warn('mkcert not found. Cannot generate trusted SSL certificates.')
    warn('Dev server will use basicSsl auto-generated self-signed certs instead.')
    const plat = getPlatform()
    if (plat === 'macos') warn('  To fix: brew install mkcert && mkcert -install')
    else if (plat === 'linux') warn('  To fix: sudo apt install mkcert && mkcert -install')
    else warn('  To fix: see https://github.com/FiloSottile/mkcert')
    warn('Then re-run: node scripts/dev.mjs setup')
    return
  }

  info('Setting up SSL certificates with mkcert...')
  installCA()

  const ip = getLanIp()
  const hostnames = ['hostname.local', 'localhost', '127.0.0.1']
  if (ip) hostnames.push(ip)

  generateCert(certDir, hostnames)

  const certInfo = getCertInfo(certDir)
  if (certInfo) {
    table([
      { label: 'Subject Alternative Names', status: 'info', detail: certInfo.sans.join(', ') },
      { label: 'Expires', status: 'info', detail: certInfo.expiry },
    ])
  }

  divider()
  const caRoot = getCARoot()
  if (caRoot) {
    info('To trust this cert on devices:')
    info('  Android:')
    info(`    adb push "${resolve(caRoot, 'rootCA.pem')}" /storage/emulated/0/Download/`)
    info('    Settings -> Security -> Install a certificate -> CA certificate')
    info('  iOS simulator: Already trusted (inherits macOS keychain)')
    info('  iOS device: AirDrop rootCA.pem, install as profile')
  }
  divider()
  warn('Using self-signed certificate. Not for production use.')
}

function cmdRun(platform) {
  header(`Deploying to ${platform}`)

  const prereqs = [checkNode()]
  if (platform === 'android') {
    prereqs.push(checkAdb())
  } else {
    prereqs.push(checkXcodebuild())
  }

  const failed = prereqs.filter((p) => !p.ok)
  if (failed.length > 0) {
    table(
      prereqs.map((p) => ({
        label: p.message.split('\n')[0],
        status: p.ok ? 'ok' : 'fail',
      })),
    )
    error('Fix issues above and re-run.')
    process.exit(1)
  }

  if (platform === 'android') {
    const devices = getConnectedAndroidDevices()
    if (devices.length === 0) {
      error('No Android devices connected.')
      info('Connect a device via USB with USB debugging enabled.')
      info('Verify with: adb devices')
      process.exit(1)
    }
    success(`Device connected: ${devices[0].id}`)
  }

  divider()

  const ip = getLanIp()
  if (!ip) {
    error('No LAN IP found. Are you connected to a network?')
    process.exit(1)
  }

  const scheme = ensureCerts(certDir, tlsEnabled, certsMode, ip)
  const serverUrl = `${scheme}://${ip}:${port}`
  info(`Dev server URL: ${serverUrl}`)

  divider()
  info('Building web assets...')
  execSync('npx vite build', { stdio: 'inherit', cwd: mobileDir })
  success('Build complete')

  divider()
  info(`Deploying to ${platform}...`)
  deployToDevice(platform, serverUrl, mobileDir)
  success(`Deployed to ${platform}`)
}
