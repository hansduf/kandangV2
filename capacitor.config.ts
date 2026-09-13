import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kandangku.app',
  appName: 'KandangKu',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: true,
    // Jika Anda ingin mengarahkan langsung ke URL Vercel untuk live update instan:
    // url: 'https://kandang-ku.vercel.app',
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
