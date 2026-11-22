/**
 * PULA Traffic + Travel data model.
 * Live road data comes ONLY from a configured PULA backend. No fake incidents,
 * traffic estimates, or straight-line routes are presented as live road data.
 */
const BACKEND_URL = (process.env.EXPO_PUBLIC_PULA_API_BASE_URL || '').replace(/\/+$/, '');
const isNum = value => typeof value === 'number' && Number.isFinite(value);
const validCity = city => city && isNum(city.lat) && isNum(city.lon) && typeof city.id === 'string';

function externalDirectionsUrl(origin, destination) {
  if (!validCity(origin) || !validCity(destination)) throw new Error('Choose two valid cities.');
  const params = [
    'api=1', `origin=${encodeURIComponent(origin.lat + ',' + origin.lon)}`,
    `destination=${encodeURIComponent(destination.lat + ',' + destination.lon)}`,
    'travelmode=driving'
  ];
  return `https://www.google.com/maps/dir/?${params.join('&')}`;
}
function configured(base = BACKEND_URL) { return /^https?:\/\/[^\s]+$/i.test(base); }
function trafficUrl(city, base = BACKEND_URL) {
  if (!validCity(city)) throw new Error('Invalid city.');
  if (!configured(base)) return null;
  return `${base}/api/traffic?cityId=${encodeURIComponent(city.id)}`;
}
function travelUrl(origin, destination, base = BACKEND_URL) {
  if (!validCity(origin) || !validCity(destination) || origin.id === destination.id) return null;
  if (!configured(base)) return null;
  return `${base}/api/route?from=${encodeURIComponent(origin.id)}&to=${encodeURIComponent(destination.id)}`;
}
function normalizeIncident(incident) {
  if (!incident || typeof incident !== 'object') return null;
  const coordinates = incident.coordinates;
  return {
    id: String(incident.id || ''),
    category: String(incident.category || 'Incident').slice(0, 80),
    description: String(incident.description || 'Reported road incident').slice(0, 220),
    road: String(incident.road || '').slice(0, 100),
    delaySeconds: isNum(incident.delaySeconds) ? Math.max(0, incident.delaySeconds) : null,
    coordinates: Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(isNum) ? coordinates : null
  };
}
function normalizeRoute(data) {
  if (!data || !isNum(data.distanceMeters) || !isNum(data.travelTimeSeconds) || data.distanceMeters < 0 || data.travelTimeSeconds < 0) return null;
  return {
    distanceKm: data.distanceMeters / 1000,
    travelMinutes: Math.ceil(data.travelTimeSeconds / 60),
    trafficDelayMinutes: isNum(data.trafficDelaySeconds) ? Math.round(data.trafficDelaySeconds / 60) : null,
    points: Array.isArray(data.points) ? data.points.filter(p => Array.isArray(p) && p.length === 2 && p.every(isNum)).slice(0,5000) : [],
    fetchedAt: data.fetchedAt || null
  };
}
async function fetchJson(url, signal) {
  const result = await fetch(url, {signal});
  if (!result.ok) {
    const payload = await result.json().catch(() => ({}));
    throw new Error(typeof payload.error === 'string' ? payload.error : result.status === 429 ? 'Traffic provider rate limit reached.' : `Traffic service unavailable (${result.status}).`);
  }
  return result.json();
}
async function fetchTraffic(city, signal, base = BACKEND_URL) {
  const url = trafficUrl(city, base);
  if (!url) return {connected: false, incidents:[], fetchedAt:null};
  const data = await fetchJson(url, signal);
  if (data.connected !== true) return {connected:false,incidents:[],fetchedAt:null};
  return {connected:true, incidents:(Array.isArray(data.incidents)?data.incidents:[]).map(normalizeIncident).filter(Boolean), fetchedAt:data.fetchedAt||null};
}
async function fetchRoute(origin, destination, signal, base = BACKEND_URL) {
  const url = travelUrl(origin, destination, base);
  if (!url) return null;
  return normalizeRoute(await fetchJson(url, signal));
}
function getTripWeatherAdvice(destinationForecast, name) {
  if (!destinationForecast) return [`Destination forecast for ${name} is unavailable.`];
  const messages = [];
  const today = destinationForecast.today || {};
  const current = destinationForecast.current || {};
  if (isNum(today.rainChance) && today.rainChance >= 60) messages.push(`Rain is possible in ${name} today (${Math.round(today.rainChance)}% maximum forecast probability).`);
  if ([95,96,99].includes(current.weather_code) || (destinationForecast.next24Hours||[]).slice(0,12).some(h=>[95,96,99].includes(h.weatherCode))) messages.push('Thunderstorms are in the destination forecast. Check official weather warnings before travel.');
  if (isNum(current.wind_speed_10m) && current.wind_speed_10m >= 45) messages.push('Strong winds are forecast at your destination.');
  if (isNum(today.uvMax) && today.uvMax >= 8) messages.push('UV is forecast to be high at your destination around midday.');
  if (!messages.length) messages.push('Review the destination forecast before leaving. Weather along the route may differ.');
  return messages;
}
module.exports = { BACKEND_URL, configured, trafficUrl, travelUrl, externalDirectionsUrl, normalizeIncident, normalizeRoute, fetchTraffic, fetchRoute, getTripWeatherAdvice };
