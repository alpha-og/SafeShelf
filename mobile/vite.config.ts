import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '')
  const mobileEnv = loadEnv(mode, process.cwd(), '')
  const env = { ...rootEnv, ...mobileEnv }

  const mobilePort = Number(env.MOBILE_PORT) || 8826

  let mobileHost: boolean | string = true
  if (env.MOBILE_HOST === 'false') {
    mobileHost = false
  } else if (env.MOBILE_HOST && env.MOBILE_HOST !== 'true') {
    mobileHost = env.MOBILE_HOST
  }

  const enableTls = env.MOBILE_TLS_ENABLED !== 'false'

  const plugins = [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ]
  if (enableTls) {
    plugins.push(basicSsl())
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: mobileHost,
      port: mobilePort,
      proxy: {
        '/v1': env.VITE_PROXY_TARGET || 'http://localhost:8926',
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  }
})
