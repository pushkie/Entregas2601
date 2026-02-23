
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.entregas2601.app',
  appName: 'Entregas2601',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Aquí podrías configurar plugins específicos si los añades luego
  }
};

export default config;
