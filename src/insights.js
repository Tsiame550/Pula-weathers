// Lightweight rules: transparent, deterministic and no unsupported AI claims.
const value = (number) => typeof number === 'number' && Number.isFinite(number) ? number : null;
const pct = n => `${Math.round(n)}%`;
const hourLabel = time => String(time || '').slice(11,16);

function findRainWindow(hours, threshold = 50) {
  const h = (hours || []).filter(item => value(item.rainChance) !== null);
  if (!h.length) return { text: 'Rainfall timing is unavailable.', start: null, end: null, peak: null };
  const first = h.findIndex(item => item.rainChance >= threshold);
  if (first === -1) return { text: `Rain chance stays below ${threshold}% over the next ${h.length} forecast hours.`, start: null, end: null, peak: Math.max(...h.map(item=>item.rainChance)) };
  let last = first;
  while (last + 1 < h.length && h[last + 1].rainChance >= threshold) last++;
  const peak = Math.max(...h.slice(first, last + 1).map(item => item.rainChance));
  const start = hourLabel(h[first].time);
  const end = last + 1 < h.length ? hourLabel(h[last+1].time) : null;
  return {
    start: h[first].time, end: last + 1 < h.length ? h[last + 1].time : null, peak,
    text: `Rain chance reaches at least ${threshold}% from about ${start}${end ? ` to ${end}` : ' onward'} (peak ${pct(peak)}). This is a probability forecast, not a guaranteed start time.`
  };
}

function getForecastAdvisories(forecast) {
  if (!forecast) return [];
  const current = forecast.current || {};
  const days = forecast.daily || [];
  const hours = forecast.next24Hours || forecast.hourly || [];
  const result = [];
  const add = (id, title, detail, level = 'heads-up') => result.push({ id, title, detail, level });
  if ([95,96,99].includes(Number(current.weather_code)) || hours.some(h => [95,96,99].includes(Number(h.weatherCode)))) {
    add('storm','Thunderstorm possible','Forecast indicates thunderstorms. Check official meteorological warnings before travel.','caution');
  }
  const gust = Math.max(value(current.wind_gusts_10m) || 0, ...hours.map(h => value(h.windGust) || 0));
  if (gust >= 60) add('wind','Strong gusts in forecast',`Wind gusts may reach about ${Math.round(gust)} km/h in the next 24 hours.`, 'caution');
  if ((value(days[0]?.rainMm) || 0) >= 30) add('rain','Heavy rainfall possible',`Model estimates about ${Math.round(days[0].rainMm)} mm total rainfall today. Local effects can vary.`, 'caution');
  if ((value(days[0]?.high) || 0) >= 38) add('heat','Very hot conditions',`Forecast high: ${Math.round(days[0].high)}°C. Take care in outdoor heat.`, 'caution');
  if (value(days[0]?.low) !== null && days[0].low <= 0) add('frost','Freezing temperatures possible',`Forecast low: ${Math.round(days[0].low)}°C. Frost can vary by elevation.`, 'heads-up');
  return result;
}

function getDailyBriefing(forecast, cityName) {
  if (!forecast) return 'Connect to the forecast to see your daily briefing.';
  const current = forecast.current || {};
  const today = forecast.today || {};
  const pieces = [];
  if (value(current.temperature_2m) !== null) pieces.push(`It's around ${Math.round(current.temperature_2m)}°C in ${cityName}.`);
  if (value(today.high) !== null && value(today.low) !== null) pieces.push(`Expect roughly ${Math.round(today.low)}–${Math.round(today.high)}°C today.`);
  const rain = findRainWindow(forecast.next24Hours || forecast.hourly || []);
  if (rain.start) pieces.push(`Rain becomes more likely around ${hourLabel(rain.start)}. An umbrella may be useful.`);
  else if (value(today.rainChance) !== null) pieces.push(`Today's maximum forecast rain probability is ${pct(today.rainChance)}.`);
  if (value(today.uvMax) !== null && today.uvMax >= 6) pieces.push('UV may be high around midday, so seek shade and use sun protection.');
  return pieces.join(' ') || 'Detailed forecast guidance is unavailable.';
}

function getFarmInsights(forecast) {
  if (!forecast) return null;
  const today = forecast.today || {};
  const hours = forecast.next24Hours || forecast.hourly || [];
  const soil = hours.find(h => value(h.soilTemp) !== null)?.soilTemp ?? null;
  const moisture = hours.find(h => value(h.soilMoisture) !== null)?.soilMoisture ?? null;
  const frost = (forecast.daily || []).slice(0, 3).some(d => value(d.low) !== null && d.low <= 2);
  const rain = value(today.rainMm);
  return {
    soilTemp: soil,
    soilMoisture: moisture,
    forecastRainMm: rain,
    et0Mm: value(today.et0),
    frostRisk: frost,
    guidance: frost ? 'Low temperatures could affect sensitive crops, especially in valleys.' :
      rain !== null && rain >= 15 ? 'Significant rainfall is forecast. Review drainage and field access.' :
      'Check local soil and field conditions before planting or irrigating.'
  };
}

function aqiLabel(index) {
  if (value(index) === null) return 'Unavailable';
  if (index <= 50) return 'Good';
  if (index <= 100) return 'Moderate';
  if (index <= 150) return 'Unhealthy for sensitive groups';
  if (index <= 200) return 'Unhealthy';
  if (index <= 300) return 'Very unhealthy';
  return 'Hazardous';
}

function nearestPresetCity(lat, lon, countries) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const all = Object.entries(countries).flatMap(([countryCode, obj]) => obj.cities.map(city => ({ ...city, countryCode })));
  const radians = deg => deg * Math.PI / 180;
  const dkm = (a, b) => {
    const dLat = radians(a.lat - b.lat), dLon = radians(a.lon - b.lon);
    const hav = Math.sin(dLat/2)**2 + Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(dLon/2)**2;
    return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(hav)));
  };
  const ranked = all.map(city => ({...city, distance: dkm({lat,lon}, city)})).sort((a,b)=>a.distance-b.distance);
  // Avoid silently associating a city in these countries with a phone elsewhere.
  return ranked[0]?.distance <= 150 ? ranked[0] : null;
}

module.exports = { findRainWindow, getForecastAdvisories, getDailyBriefing, getFarmInsights, aqiLabel, nearestPresetCity };
