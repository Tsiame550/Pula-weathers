# Upgrade the existing PULA folder to v3.3 (no reinstall)

These instructions also work if your folder is still named `pula-weather-v3.1` but contains v3.2 code.

1. **Back up** `C:\Users\BrainTech\Documents\pula-weather-v3.1` before replacing files.
2. Stop Metro (`Ctrl+C`) and the traffic server (`Ctrl+C`). Keep the PowerShell terminal that holds your TomTom key open.
3. From your existing PULA root folder in VS Code PowerShell, after downloading the patch ZIP to Downloads, run:

```powershell
Expand-Archive -Path "$env:USERPROFILE\Downloads\PULA-v3.3-map-fix-patch.zip" -DestinationPath (Get-Location).Path -Force
npm test
```

4. In the PowerShell terminal that holds the private TomTom key, run:

```powershell
$env:TOMTOM_API_KEY.Length
npm run traffic:server
```

The key length should be nonzero. Do not share or print the key itself. If missing, copy it privately into the environment variable as before.

5. In another terminal, restart Expo:

```powershell
npx expo start --clear
```

6. Test Weather -> Leribe (Hlotse) and Maputsoe, Traffic -> Maputsoe, Travel -> select Maputsoe, and Map/Traffic/Travel -> **Explore full screen**. In the full-screen map, switch **Road / Satellite**, use the in-map search, drag with one finger and pinch with two. The normal screen scrolls only outside the full-screen map.

### Notes
- No new npm dependency is needed; you do not need to install Android Studio.
- `.env` and the TomTom secret are **not included** in this ZIP. Keep `EXPO_PUBLIC_PULA_API_BASE_URL` pointed at your reachable backend and TomTom credentials only in the backend terminal.
- Satellite imagery requires internet access, is not real-time weather imagery, and may be restricted by the provider's licensing terms for production use.
- Zoom and pan improvements are implemented, but need verification on your Samsung/Chrome; automated tests do not measure device frame-rate.
