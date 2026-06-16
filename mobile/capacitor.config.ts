import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.safeshelf.app',
  appName: 'SafeShelf',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    ...(process.env.CAP_SERVER_URL ? { url: process.env.CAP_SERVER_URL, cleartext: true } : {}),
  },
}

export default config
