import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.rite.habits",
  appName: "Rite",
  webDir: "dist-native",
  backgroundColor: "#f3eee4",
  server: {
    androidScheme: "https",
    hostname: "localhost",
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#f3eee4",
      launchAutoHide: true,
      launchShowDuration: 2500,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#f3eee4",
    },
    LocalNotifications: {
      iconColor: "#2F4A3C",
    },
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    backgroundColor: "#f3eee4",
  },
};

export default config;
