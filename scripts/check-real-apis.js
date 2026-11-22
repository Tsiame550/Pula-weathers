/**
 * Test PULA's real API endpoints from the user's own computer.
 * Does not use fabricated weather, route, or traffic readings.
 * Never logs or requests the TomTom API key from the app.
 */
const {COUNTRIES} = require('../src/cities');
const {buildForecastUrl, buildAirQualityUrl} = require('../src/weather');
const maseru = COUNTRIES.LS.cities.find(c => c.id === 'ls-maseru');
const joburg = COUNTRIES.ZA.cities.find(c => c.id === 'za-johannesburg');
const BASE = (process.env.PULA_API_BASE_URL || 'http://127.0.0.1:3030').replace(/\/+$/, '');
async function json(url, seconds = 14) {
  const response = await fetch(url, {signal: AbortSignal.timeout(seconds * 1000)});
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
async function runCheck(name, action) {
  process.stdout.write(`\n${name}\n`);
  try { await action(); return true; }
  catch(error) { console.log(`  NOT READY: ${error.message}`); return false; }
}
async function main(){
  const results = [];
  results.push(await runCheck('Weather · Open-Meteo · Maseru', async()=>{
    const data = await json(buildForecastUrl(maseru));
    if (typeof data.current?.temperature_2m !== 'number') throw new Error('Provider returned no current temperature.');
    console.log(`  LIVE: ${data.current.temperature_2m}°C at ${data.current.time} (provider timezone ${data.timezone})`);
  }));
  results.push(await runCheck('Air quality · Open-Meteo · Maseru', async()=>{
    const data = await json(buildAirQualityUrl(maseru));
    if (!data.current) throw new Error('Provider returned no air-quality measurement.');
    console.log(`  LIVE: PM2.5 ${data.current.pm2_5 ?? 'not provided'} µg/m³, US AQI ${data.current.us_aqi ?? 'not provided'} at ${data.current.time || 'unspecified time'}`);
  }));
  let available = false;
  results.push(await runCheck('Traffic backend · PULA local server', async()=>{
    const h = await json(`${BASE}/health`, 5);
    if (!h.ok) throw new Error('Unexpected health response.');
    console.log(`  Server reachable at ${BASE}; TomTom key ${h.trafficConfigured ? 'configured' : 'NOT configured'}`);
    available = Boolean(h.trafficConfigured);
    if (!available) throw new Error('Backend is reachable, but TomTom key is missing.');
  }));
  if (available){
    results.push(await runCheck('Live incidents · TomTom · Maseru',async()=>{
      const data = await json(`${BASE}/api/traffic?cityId=${maseru.id}`);
      if (data.connected !== true || !Array.isArray(data.incidents)) throw new Error('Provider did not return a usable incidents response.');
      console.log(`  LIVE: ${data.incidents.length} reported incidents in search area, fetched ${data.fetchedAt}`);
      console.log('  Zero incidents is not a road-clear guarantee.');
    }));
    results.push(await runCheck('Real road route · TomTom · Maseru to Johannesburg',async()=>{
      const data = await json(`${BASE}/api/route?from=${maseru.id}&to=${joburg.id}`);
      if (!Number.isFinite(data.distanceMeters) || !Number.isFinite(data.travelTimeSeconds)) throw new Error('Provider did not return a route estimate.');
      console.log(`  LIVE: ${(data.distanceMeters/1000).toFixed(1)} km, ${(data.travelTimeSeconds/60).toFixed(0)} minutes, traffic delay ${data.trafficDelaySeconds == null ? 'unknown' : `${(data.trafficDelaySeconds/60).toFixed(0)} minutes`}`);
      console.log('  Route estimates are time-sensitive and may omit border crossing delays.');
    }));
  }
  console.log(`\nResult: ${results.filter(Boolean).length}/${results.length} checks ready.`);
  if (results.some(r=>!r)) process.exitCode = 1;
}
main().catch(err=>{console.error('API checks failed:',err.message);process.exitCode=1;});
