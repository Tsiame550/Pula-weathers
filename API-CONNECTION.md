# Connect real APIs to PULA v3.2 (Windows + Android)

## Current truth

- **Weather, air quality, and Farm:** Real Open-Meteo API calls are already implemented. These work with an internet connection and do not require a test API key. Open-Meteo's public API is for non-commercial usage; review its terms before a commercial launch and provide attribution.
- **Traffic, road incidents, and in-app route times:** Real TomTom endpoint integration is implemented, but **requires your TomTom API key** on a local/deployed backend.
- **Google Maps:** The Travel tab can open real directions in Google Maps even without a TomTom key. Those directions appear in the external Google Maps app/site, not inside PULA.
- **Official alerts, border waiting times, and radar:** Not implemented. Do not interpret PULA's forecast guidance as official warnings.

## A. Get your TomTom key

1. Visit https://my.tomtom.com/ and sign in or register.
2. Open **Keys → API & SDK Keys**, then choose or create a key that includes Traffic API and Routing API.
3. Keep the API key secret; **do not paste it into chat, `.env` in your mobile source, or any file committed to Git**.

Docs: https://docs.tomtom.com/platform/documentation/my-tomtom/how-to-get-a-tomtom-api-key

## B. Run the traffic backend locally (VS Code terminal 1)

From the PULA project directory:

```powershell
.\scripts\start-traffic.ps1
```

The key prompt is masked and stays only in that PowerShell session. The server starts at `http://localhost:3030` and must remain running during testing.

If your system blocks PowerShell scripts, do not change security policy. Instead, run:

```powershell
$secret = Read-Host 'TomTom API key' -AsSecureString
$handle = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try { $env:TOMTOM_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($handle) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($handle) }
node server/server.js
```

After stopping this terminal, remove the variable using `Remove-Item Env:TOMTOM_API_KEY` or close the terminal. Do not reveal the key in logs.

## C. Check the APIs (VS Code terminal 2)

```powershell
npm run apis:check
```

This checks a **real** Maseru weather response, air quality, the local traffic server, TomTom incident data near Maseru, and a TomTom Maseru→Johannesburg route. It will print an honest error when a service has no valid key or no connectivity. It never fabricates live traffic values.

## D. Connect your Chrome PULA app (VS Code terminal 3)

Create a plain `.env` file in the project root with only this public server address:

```ini
EXPO_PUBLIC_PULA_API_BASE_URL=http://localhost:3030
```

**No TomTom API key goes in this file.** Restart Expo after changing the file:

```powershell
npm run web
```

Weather works without this file; traffic and route data require it.

## E. Connect your Samsung phone

`localhost` on a phone means **the phone itself**, not your laptop. For local testing on the same Wi-Fi:

1. Open PowerShell on the laptop and run `ipconfig`. Note the laptop's Wi-Fi **IPv4 Address** (e.g. `192.168.1.25`).
2. Set the app's `.env` to `EXPO_PUBLIC_PULA_API_BASE_URL=http://192.168.1.25:3030` (replace with your actual IP).
3. Keep the Node traffic server running and ensure Windows Firewall allows its LAN connection. Avoid public/unknown Wi-Fi networks.
4. Stop and restart Expo: `npx expo start --tunnel` or `npx expo start`.
5. If Android blocks HTTP cleartext or the connection cannot reach the laptop, use a **deployed HTTPS backend** instead of disabling platform security settings. The app may be unable to use a local plain-HTTP API in standalone builds.

**For a public production app:** deploy the server to your trusted host using `TOMTOM_API_KEY` as a secret environment variable, configure `EXPO_PUBLIC_PULA_API_BASE_URL=https://your-backend.example`, and implement authentication, global rate limiting, monitoring, and cost controls. A phone app must never contain the private TomTom key.

## Provider notes

- Open-Meteo: https://open-meteo.com/en/docs and https://open-meteo.com/en/pricing
- TomTom Traffic Market Coverage: https://docs.tomtom.com/traffic-api/documentation/tomtom-maps/v1/product-information/market-coverage
- TomTom Traffic incidents: https://docs.tomtom.com/traffic-api/documentation/tomtom-maps/v1/traffic-incidents/incident-details
- TomTom routing: https://docs.tomtom.com/routing-api/documentation/tomtom-maps/v1/calculate-route

No live TomTom credentials are included in the project. Integration/unit tests use mocked provider responses and are not proof of live provider access.
