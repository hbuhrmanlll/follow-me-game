import type { CapacitorConfig } from '@capacitor/cli';

// Settings for the Android app (see ANDROID.md).
const config: CapacitorConfig = {
  appId: 'com.thirdheavenstudios.followme',
  appName: 'Follow Me',
  webDir: 'dist',
  backgroundColor: '#1b1410',
  android: {
    // The game never loads anything from the internet.
    allowMixedContent: false,
  },
};

export default config;
