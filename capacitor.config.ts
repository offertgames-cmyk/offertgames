import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tabby.ticketsplit',
  appName: 'Tabby TicketSplit',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
