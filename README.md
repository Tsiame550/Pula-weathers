# PULA v3.2 — Weather · Traffic · Travel (Browser + Android)

Source project for **Lesotho and South Africa**, built with Expo SDK 58 and React Native. The v3 weather animation, adaptive themes, saved cities, map, traffic, cross-border travel, and farm features remain.

## What is new in v3.2

**Real API activation:** See [API-CONNECTION.md](API-CONNECTION.md) for the verified Open-Meteo sources, obtaining a TomTom API key, a masked-key Windows setup, `npm run apis:check`, and connecting Chrome/Android to the backend. New provider error handling distinguishes missing permissions and rate limits.

## Browser / Android updates from v3.1

- **Browser testing**: React Native Web packages and `npm run web`; embedded animated SVG and Leaflet maps render in sandboxed browser iframes instead of native-only WebViews. City marker taps can report selection to the React Native UI.
- **Web-friendly permissions**: Browser geolocation uses the browser's permission prompt. Browser notifications explicitly remain off (Android only); the UI explains this.
- **Cloud Android APK profile**: `eas.json` already included an APK profile; v3.1 confirms the preview profile is a standalone APK (not a debug client) and provides instructions. You will create the APK in your own Expo account.
- **Local traffic backend CORS**: allows default Expo web dev origins `http://localhost:8081` and `http://localhost:19006`. To permit a different origin, set the backend server environment variable `PULA_ALLOWED_WEB_ORIGINS` as a comma-separated allowlist. Never put `TOMTOM_API_KEY` in a web/mobile bundle.

## A. Test in Chrome on Windows — no Android Studio

1. Download and **extract** the ZIP. In VS Code, open the folder **containing `package.json`**.
2. Install **Node.js 22 LTS or newer** (Expo SDK 58 requires Node 22.13 or later).
3. Run these PowerShell commands in VS Code:

```powershell
npm install
npx expo install --fix
npm test
npm run web
```

4. Open the localhost URL the terminal prints (usually `http://localhost:8081`) in Chrome. The web page should show PULA's Weather, Traffic, Travel, Map and Farm tabs.
5. Try Lesotho/South Africa switching, choosing cities, animated weather, and Travel directions. Weather data requires internet access. The map uses hosted Leaflet assets and OpenStreetMap tiles, also requiring internet.

**Browser limitations:** This is a local browser test, not a hosted website. Notifications are Android only. Geolocation requires your browser's permission and a secure origin (`localhost` works). Browser maps run within iframes and may be affected by network/content blockers. Live TomTom traffic is **not included** until a backend and API key are connected.

## B. Test the Android app on your Samsung — no Android Studio

Start a second VS Code terminal (do not close your web server) and run:

```powershell
npx expo start --tunnel
```

Install a compatible **Expo Go** version on the phone, then scan the QR code from this terminal. If port conflicts occur, Expo may choose a new port; follow its prompt. The phone needs internet. For on-device behavior not supported by Expo Go, use the standalone APK below.

## C. Build your own installable APK using Expo cloud builds

Sign up for a free or paid Expo account (subject to Expo's build limits). From your extracted project directory, run:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

Follow the prompts to link the project to your Expo account and handle Android signing credentials securely. The build runs in Expo's cloud. **When the build succeeds**, download the `.apk` using the link in the Expo terminal/dashboard and install it on your own phone, accepting Android's installation prompt. Builds require internet access and may be subject to quotas. No APK is included in the ZIP.

## D. Traffic connection (optional during testing)

Without a TomTom API key, Traffic intentionally shows **Not connected**. Travel can open external driving directions, but shows no invented road distances, ETAs, congestion data, or incidents.

Use the server-side proxy from `server/server.js`. Set `TOMTOM_API_KEY` **on the backend only**, run `npm run traffic:server`, and set the app's `EXPO_PUBLIC_PULA_API_BASE_URL` to the backend's reachable URL. For Chrome on the same laptop, `http://localhost:3030` works; on a phone you must use a reachable HTTPS host or the computer's LAN IP (and verify Android cleartext policy). Restart the app after changing environment variables. See `.env.example` and `server/.env.example`.

> **Privacy and accuracy:** Browser/Android location requires user consent. The map is not radar. Travel and weather risk guidance are informational only and are not official road or weather warnings. Live traffic is disabled until configured.

## Validation scope

The included Node unit tests verify weather/traffic data logic, no invented estimates, browser adapter wiring, backend CORS allowlisting, and APK build configuration. We did not run `npm install`, start the Expo browser bundle, install an APK, or test on a physical Android device in this environment because external npm registry access is unavailable. Test those steps on your Windows computer and report any errors.
