#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getConnectedAndroidDevices } from './lib/device.mjs'
import { divider, error, header, info, success, table } from './lib/logger.mjs'
import { checkAdb, checkNode, checkXcodebuild } from './lib/system.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mobileDir = resolve(__dirname, '..')

main()

function main() {
  const cmd = process.argv[2]
  if (!cmd || cmd === '--help' || cmd === 'help') {
    showHelp()
    return
  }
  switch (cmd) {
    case 'android':
      return cmdAndroid()
    case 'ios':
      return cmdIos()
    default:
      warn(`Unknown command: ${cmd}`)
      showHelp()
      process.exit(1)
  }
}

function showHelp() {
  header('SafeShelf Production Build Script')
  divider()
  info('Usage: node scripts/build.mjs <command>')
  divider()
  table([
    { label: 'android', status: '', detail: 'Build bundled APK and install on Android device' },
    { label: 'ios', status: '', detail: 'Build bundled app and run on iOS simulator/device' },
  ])
}

function checkPrereqs(checks) {
  const results = checks.map((fn) => fn())
  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    table(
      results.map((r) => ({
        label: r.message.split('\n')[0],
        status: r.ok ? 'ok' : 'fail',
      })),
    )
    divider()
    error('Fix issues above and re-run.')
    process.exit(1)
  }
  table(
    results.map((r) => ({
      label: r.message.split('\n')[0],
      status: r.ok ? 'ok' : 'fail',
    })),
  )
}

function cmdAndroid() {
  header('Building Android Production APK')

  checkPrereqs([checkNode, checkAdb])

  const devices = getConnectedAndroidDevices()
  if (devices.length === 0) {
    error('No Android devices connected.')
    info('Connect a device via USB with USB debugging enabled.')
    info('Verify with: adb devices')
    process.exit(1)
  }
  success(`Device connected: ${devices[0].id}`)
  divider()

  info('Building web assets...')
  execSync('npx vite build', { stdio: 'inherit', cwd: mobileDir })
  success('Web build complete')
  divider()

  info('Syncing to Capacitor...')
  execSync('npx cap sync android', { stdio: 'inherit', cwd: mobileDir })
  success('Capacitor sync complete')
  divider()

  const androidDir = resolve(mobileDir, 'android')
  info('Building debug APK with Gradle...')
  execSync('./gradlew assembleDebug', { stdio: 'inherit', cwd: androidDir })
  success('APK build complete')
  divider()

  const apkPath = resolve(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
  info(`Installing ${apkPath}...`)
  execSync(`adb install -r "${apkPath}"`, { stdio: 'inherit' })
  success('APK installed on device')
  divider()
  success('Done! SafeShelf is installed on your device.')
}

function cmdIos() {
  header('Building iOS Production App')

  checkPrereqs([checkNode, checkXcodebuild])
  divider()

  const iosDir = resolve(mobileDir, 'ios')
  if (!existsSync(iosDir)) {
    error('iOS project not found. Generate it first:')
    info('  cd mobile && npx cap add ios')
    info('This is a one-time setup step.')
    process.exit(1)
  }

  info('Building web assets...')
  execSync('npx vite build', { stdio: 'inherit', cwd: mobileDir })
  success('Web build complete')
  divider()

  info('Syncing to Capacitor...')
  execSync('npx cap sync ios', { stdio: 'inherit', cwd: mobileDir })
  success('Capacitor sync complete')
  divider()

  info('Building and launching via Capacitor...')
  execSync('npx cap run ios', { stdio: 'inherit', cwd: mobileDir })
  success('iOS app deployed')
}
