const API_BASE = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';

function getWeatherDescription(code) {
  const n = Number(code);
  if (n === 0) return { title: 'Clear sky', icon: 'sun', mood: 'clear' };
  if (n === 1) return { title: 'Mainly clear', icon: 'sun', mood: 'clear' };
  if (n === 2) return { title: 'Partly cloudy', icon: 'cloud', mood: 'cloudy' };
  if (n === 3) return { title: 'Overcast', icon: 'cloud', mood: 'cloudy' };
  if ([45, 48].includes(n)) return { title: 'Foggy', icon: 'cloud', mood: 'cloudy' };
  if ([51, 53, 55, 56, 57].includes(n)) return { title: 'Light drizzle', icon: 'cloud-drizzle', mood: 'rainy' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(n)) return { title: 'Rain showers', icon: 'cloud-rain', mood: 'rainy' };
  if ([71, 73, 75, 77, 85, 86].includes(n)) return { title: 'Snow', icon: 'cloud-snow', mood: 'snowy' };
  if ([95, 96, 99].includes(n)) return { title: 'Thunderstorms', icon: 'cloud-lightning', mood: 'stormy' };
  return { title: 'Changing conditions', icon: 'cloud', mood: 'cloudy' };
}

function buildForecastUrl(city) {
  const query = new URLSearchParams({
    latitude: String(city.lat),
    longitude: String(city.lon),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,cloud_cover',
    hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,uv_index,visibility,soil_temperature_0cm,soil_moisture_0_to_7cm,et0_fao_evapotranspiration,wind_gusts_10m,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,et0_fao_evapotranspiration,sunrise,sunset',
    timezone: 'auto',
    forecast_days: '7',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh'
  });
  return `${API_BASE}?${query.toString()}`;
}

function buildAirQualityUrl(city) {
  return `${AIR_QUALITY_BASE}?${new URLSearchParams({
    latitude: String(city.lat), longitude: String(city.lon),
    current: 'us_aqi,pm2_5', timezone: 'auto'
  })}`;
}

function buildMapUrl(cities) {
  if (!Array.isArray(cities) || !cities.length) throw new Error('Map requires locations.');
  return `${API_BASE}?${new URLSearchParams({
    latitude: cities.map(c => String(c.lat)).join(','),
    longitude: cities.map(c => String(c.lon)).join(','),
    current: 'temperature_2m,precipitation,wind_speed_10m,cloud_cover,weather_code',
    timezone: 'auto'
  })}`;
}

function parseForecast(response) {
  if (!response || !response.current || !response.hourly || !response.daily) {
    throw new Error('The weather service returned an incomplete forecast.');
  }
  const hourly = response.hourly;
  const daily = response.daily;
  if (!Array.isArray(hourly.time) || !Array.isArray(daily.time)) {
    throw new Error('The weather data is not in the expected format.');
  }
  const currentHour = String(response.current.time || '').slice(0, 13);
  let firstHour = hourly.time.findIndex(value => String(value).slice(0, 13) >= currentHour);
  if (firstHour < 0) firstHour = 0;
  const toHour = (time, i) => ({
    time,
    temp: hourly.temperature_2m?.[i],
    rainChance: hourly.precipitation_probability?.[i],
    precipitation: hourly.precipitation?.[i],
    weatherCode: hourly.weather_code?.[i],
    uvIndex: hourly.uv_index?.[i],
    visibilityM: hourly.visibility?.[i],
    soilTemp: hourly.soil_temperature_0cm?.[i],
    soilMoisture: hourly.soil_moisture_0_to_7cm?.[i],
    et0: hourly.et0_fao_evapotranspiration?.[i],
    windGust: hourly.wind_gusts_10m?.[i],
    wind: hourly.wind_speed_10m?.[i]
  });
  const nextHours = hourly.time.slice(firstHour, firstHour + 24).map((time, index) => toHour(time, firstHour + index));
  return {
    current: response.current,
    timezone: response.timezone || 'Africa/Maseru',
    fetchedAt: new Date().toISOString(),
    today: {
      high: daily.temperature_2m_max?.[0],
      low: daily.temperature_2m_min?.[0],
      sunrise: daily.sunrise?.[0],
      sunset: daily.sunset?.[0],
      rainChance: daily.precipitation_probability_max?.[0],
      rainMm: daily.precipitation_sum?.[0],
      uvMax: daily.uv_index_max?.[0],
      et0: daily.et0_fao_evapotranspiration?.[0]
    },
    // Preserve original compact 12-hour view while supporting 24h rain insight.
    hourly: nextHours.slice(0, 12),
    next24Hours: nextHours,
    daily: daily.time.slice(0, 7).map((date, index) => ({
      date,
      weatherCode: daily.weather_code?.[index],
      high: daily.temperature_2m_max?.[index],
      low: daily.temperature_2m_min?.[index],
      rainChance: daily.precipitation_probability_max?.[index],
      rainMm: daily.precipitation_sum?.[index],
      uvMax: daily.uv_index_max?.[index],
      et0: daily.et0_fao_evapotranspiration?.[index]
    }))
  };
}

async function fetchWeather(city, signal) {
  const result = await fetch(buildForecastUrl(city), { signal });
  if (!result.ok) throw new Error(`Weather service error (${result.status}).`);
  return parseForecast(await result.json());
}

async function fetchAirQuality(city, signal) {
  const result = await fetch(buildAirQualityUrl(city), { signal });
  if (!result.ok) throw new Error(`Air-quality service error (${result.status}).`);
  const payload = await result.json();
  return { aqi: payload.current?.us_aqi ?? null, pm25: payload.current?.pm2_5 ?? null, time: payload.current?.time || null };
}

async function fetchMapConditions(cities, signal) {
  const response = await fetch(buildMapUrl(cities), { signal });
  if (!response.ok) throw new Error(`Map weather request failed (${response.status}).`);
  const payload = await response.json();
  const locations = Array.isArray(payload) ? payload : [payload];
  if (locations.length !== cities.length) throw new Error('Map weather response did not match locations.');
  return cities.map((city, i) => ({
    ...city,
    temperature: locations[i].current?.temperature_2m ?? null,
    precipitation: locations[i].current?.precipitation ?? null,
    wind: locations[i].current?.wind_speed_10m ?? null,
    cloud: locations[i].current?.cloud_cover ?? null,
    weatherCode: locations[i].current?.weather_code ?? null,
    updated: locations[i].current?.time || null
  }));
}

function formatTemperature(value) {
  return typeof value === 'number' ? `${Math.round(value)}°` : '—';
}
function getFriendlyDate(isoDate, dayIndex) {
  if (dayIndex === 0) return 'Today';
  if (dayIndex === 1) return 'Tomorrow';
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
}
function getHour(isoTime) { return `${isoTime.slice(11, 13)}:00`; }

module.exports = {
  API_BASE, getWeatherDescription, buildForecastUrl, buildAirQualityUrl, buildMapUrl,
  parseForecast, fetchWeather, fetchAirQuality, fetchMapConditions,
  formatTemperature, getFriendlyDate, getHour
};
