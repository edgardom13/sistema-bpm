import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pandelsur.bpm',
  appName: 'Sistema BPM',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      backgroundColor: '#0C121E'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3C50E0',
      showSpinner: true,
      spinnerColor: '#FFFFFF',
      spinnerStyle: 'small'
    },
  }
};

export default config;