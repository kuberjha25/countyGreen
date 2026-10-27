const fs = require("fs");
const path = require("path");

/**
 * Extends app.json with the Firebase config files (same setup as the Meraqui app).
 * google-services.json sits in the project root, so EAS Build picks it up from the repo;
 * GOOGLE_SERVICES_JSON / GOOGLE_SERVICE_INFO_PLIST can optionally point elsewhere.
 *
 * A path is only set when the file exists — Expo refuses the config otherwise.
 * iOS has no GoogleService-Info.plist yet, so an iOS build drops the React Native
 * Firebase plugins (they hard-fail without it): that build simply has no FCM,
 * which src/push.ts already handles. Adding the plist to the root turns it on.
 */
const FIREBASE_PLUGINS = ["@react-native-firebase/app", "@react-native-firebase/messaging"];

function existingFile(envPath, fallback) {
  const file = envPath || fallback;
  return fs.existsSync(path.resolve(__dirname, file)) ? file : undefined;
}

module.exports = ({ config }) => {
  const androidFile = existingFile(process.env.GOOGLE_SERVICES_JSON, "./google-services.json");
  const iosFile = existingFile(process.env.GOOGLE_SERVICE_INFO_PLIST, "./GoogleService-Info.plist");

  // EAS sets this for the platform being built; unset for `expo start` etc.
  const buildPlatform = process.env.EAS_BUILD_PLATFORM;
  const missingForBuild = (buildPlatform === "ios" && !iosFile) || (buildPlatform === "android" && !androidFile);
  const plugins = missingForBuild ? config.plugins.filter((plugin) => !FIREBASE_PLUGINS.includes(Array.isArray(plugin) ? plugin[0] : plugin)) : config.plugins;

  return {
    ...config,
    plugins,
    android: { ...config.android, ...(androidFile && { googleServicesFile: androidFile }) },
    ios: { ...config.ios, ...(iosFile && { googleServicesFile: iosFile }) },
  };
};
