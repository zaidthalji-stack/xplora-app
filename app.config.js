export default ({ config }) => ({
  ...config,
  name: "XplorA",
  slug: "XplorA-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/images/icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  server: {
    port: 8081,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? "your-project-id"
    }
  },
  owner: process.env.EXPO_OWNER ?? undefined,
  updates: {
    url: false
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.yourcompany.propertyapp",
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "We need your location to show properties near you.",
      NSCameraUsageDescription: "We need camera access for property photos."
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.yourcompany.propertyapp",
    permissions: [
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.CAMERA"
    ]
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png"
  },
  plugins: [
    "expo-router",
    "expo-location"
  ]
});