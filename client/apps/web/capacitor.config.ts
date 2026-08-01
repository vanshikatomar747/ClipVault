import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.clipvault.app',
  appName: 'ClipVault',
  webDir: 'dist',
  server: {
    androidScheme: 'http'
  }
};

export default config;
