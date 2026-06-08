import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pandelsur.bpm',
  appName: 'Sistema BPM',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3C50E0',
      showSpinner: true,
      spinnerColor: '#FFFFFF'
    }
  }
};

export default config;