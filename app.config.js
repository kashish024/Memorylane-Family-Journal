// app.config.js
// Load environment variables if dotenv is available
try {
  require('dotenv/config');
} catch (e) {
  // dotenv not available, environment variables should be set externally
  console.log('dotenv not available, using external env vars');
}

export default {
  expo: {
    name: "MemoryLane: Family Journal",
    slug: "MemoryLane",
    version: "1.2.3",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    scheme: "memorylane",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#87C38F"
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.kashish024.memorylane",
      buildNumber: "1",
      infoPlist: {
        NSCameraUsageDescription: "MemoryLane needs camera access to capture photos of precious moments.",
        NSPhotoLibraryUsageDescription: "MemoryLane needs photo library access to save and view your memories.",
        NSMicrophoneUsageDescription: "MemoryLane needs microphone access to record voice notes.",
        NSPhotoLibraryAddUsageDescription: "MemoryLane needs permission to save photos to your library."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#87C38F"
      },
      package: "com.kashish024.memorylane",
      versionCode: 19
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "8af8571b-fcb4-43c0-9526-19bbb03223a1"
      },
      // TEMP: app currently sends email and calls AI directly from client runtime.
      // These keys are required until backend proxy endpoints are implemented.
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      REVENUECAT_API_KEY_IOS: process.env.REVENUECAT_API_KEY_IOS,
      REVENUECAT_API_KEY_ANDROID: process.env.REVENUECAT_API_KEY_ANDROID,
      REVENUECAT_TEST_STORE_API_KEY: process.env.REVENUECAT_TEST_STORE_API_KEY, // For Expo Go testing
    },
    plugins: [
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static"
          }
        }
      ],
      [
        "expo-notifications",
        {
          color: "#E07A5F",
          defaultChannel: "memorylane-reminders"
        }
      ]
    ]
  }
};