import fs from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '')
  const mobileEnv = loadEnv(mode, process.cwd(), '')
  const env = { ...rootEnv, ...mobileEnv }

  const mobilePort = Number(env.MOBILE_PORT) || 8826

  let mobileHost: boolean | string = true
  if (env.MOBILE_PREVIEW_HOST === 'false') {
    mobileHost = false
  } else if (env.MOBILE_PREVIEW_HOST && env.MOBILE_PREVIEW_HOST !== 'true') {
    mobileHost = env.MOBILE_PREVIEW_HOST
  }

  let allowedHosts: true | string[] | undefined = true
  if (env.MOBILE_ALLOWED_HOSTS === 'false') {
    allowedHosts = undefined
  } else if (env.MOBILE_ALLOWED_HOSTS && env.MOBILE_ALLOWED_HOSTS !== 'true') {
    allowedHosts = env.MOBILE_ALLOWED_HOSTS.split(',').map((h) => h.trim())
  }

  const enableTls = env.MOBILE_TLS_ENABLED !== 'false'

  const certDir = path.resolve(__dirname, 'dev-certs')
  const certFile = path.join(certDir, 'hostname.local+2.pem')
  const keyFile = path.join(certDir, 'hostname.local+2-key.pem')
  const hasMkcert = fs.existsSync(certFile) && fs.existsSync(keyFile)

  const plugins = [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ]
  if (enableTls && !hasMkcert) {
    plugins.push(basicSsl())
  }

  const server: Record<string, unknown> = {
    host: mobileHost,
    port: mobilePort,
    allowedHosts,
    proxy: {
      '/v1': {
        target: env.VITE_PROXY_TARGET || 'http://localhost:8926',
        changeOrigin: true,
        secure: false,
      },
    },
  }

  if (enableTls && hasMkcert) {
    server.https = {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile),
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server,
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  }
})
