// Custom entry: push handlers (Firebase background message handler + how notifications show
// while the app is open) must be registered before the app renders — and also in headless
// mode, when a push wakes a closed app — so they are set up here, then Expo Router boots.
import { registerPushHandlers } from "./src/push";

registerPushHandlers();

require("expo-router/entry");
