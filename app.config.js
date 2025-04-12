import 'dotenv/config';

export default {
  name: "Barcode Price Tracker",
  slug: "barcode-price-tracker",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.yourcompany.barcodepricer"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.yourcompany.barcodepricer",
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY
      }
    }
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  plugins: [
    "expo-secure-store",
    "expo-barcode-scanner",
    "expo-camera"
  ],
  extra: {
    // Pass environment variables to the app
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_MCP_ACCESS_TOKEN: process.env.SUPABASE_MCP_ACCESS_TOKEN,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    eas: {
      projectId: "your-eas-project-id"
    }
  }
}; 