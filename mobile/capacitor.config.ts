import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.safeshelf.app',
  appName: 'SafeShelf',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
