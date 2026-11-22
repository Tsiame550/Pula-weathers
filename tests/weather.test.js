const assert = require('node:assert/strict');
const test = require('node:test');
const { COUNTRIES } = require('../src/cities');
const { buildForecastUrl, getWeatherDescription, parseForecast, getFriendlyDate } = require('../src/weather');

test('both countries have distinct city lists with coordinate data', () => {
  assert.ok(COUNTRIES.ZA.cities.length >= 8);
  assert.ok(COUNTRIES.LS.cities.length >= 8);
  assert.equal(new Set([...COUNTRIES.ZA.cities, ...COUNTRIES.LS.cities].map((c) => c.id)).size, COUNTRIES.ZA.cities.length + COUNTRIES.LS.cities.length);
});

test('weather API requests real forecasts for each city in its local timezone', () => {
  const url = new URL(buildForecastUrl(COUNTRIES.LS.cities[0]));
  assert.equal(url.hostname, 'api.open-meteo.com');
  assert.equal(url.searchParams.get('forecast_days'), '7');
  assert.equal(url.searchParams.get('timezone'), 'auto');
  assert.equal(url.searchParams.get('latitude'), '-29.3167');
});

test('WMO weather codes map to human descriptions', () => {
  assert.equal(getWeatherDescription(0).title, 'Clear sky');
  assert.equal(getWeatherDescription(95).mood, 'stormy');
  assert.equal(getWeatherDescription(61).icon, 'cloud-rain');
});

test('weather response is parsed into 12 upcoming hours and 7 days', () => {
  const days = Array.from({ length: 7 }, (_, i) => `2026-11-${String(22 + i).padStart(2, '0')}`);
  const hours = Array.from({ length: 24 }, (_, i) => `2026-11-22T${String(i).padStart(2, '0')}:00`);
  const actual = parseForecast({
    current: { time: '2026-11-22T06:15', temperature_2m: 19 },
    hourly: { time: hours, temperature_2m: hours.map(() => 21), precipitation_probability: hours.map(() => 8), weather_code: hours.map(() => 2) },
    daily: { time: days, weather_code: days.map(() => 1), temperature_2m_max: days.map(() => 25), temperature_2m_min: days.map(() => 13), precipitation_probability_max: days.map(() => 20), sunrise: days.map(() => '2026-11-22T05:00'), sunset: days.map(() => '2026-11-22T19:00') }
  });
  assert.equal(actual.hourly.length, 12);
  assert.equal(actual.hourly[0].time, '2026-11-22T06:00');
  assert.equal(actual.daily.length, 7);
  assert.equal(actual.today.high, 25);
  assert.equal(getFriendlyDate(days[0], 0), 'Today');
});

test('malformed response is rejected', () => {
  assert.throws(() => parseForecast({}), /incomplete/);
});
