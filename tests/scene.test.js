const assert = require('node:assert/strict');
const test = require('node:test');
const { getSceneForWeather } = require('../src/sceneMapping');
const { buildSceneHtml } = require('../src/sceneHtml');
const { buildForecastUrl } = require('../src/weather');
const { COUNTRIES } = require('../src/cities');

test('WMO conditions select the appropriate animation', () => {
  assert.equal(getSceneForWeather({ weather_code: 0, temperature_2m: 21, is_day: 1 }).condition, 'clear');
  assert.equal(getSceneForWeather({ weather_code: 0, temperature_2m: 34, is_day: 1 }).condition, 'hot');
  assert.equal(getSceneForWeather({ weather_code: 3, is_day: 1 }).condition, 'cloud');
  assert.equal(getSceneForWeather({ weather_code: 61, is_day: 1 }).condition, 'rain');
  assert.equal(getSceneForWeather({ weather_code: 71, is_day: 1 }).condition, 'snow');
  assert.equal(getSceneForWeather({ weather_code: 95, is_day: 1 }).condition, 'storm');
  assert.equal(getSceneForWeather({ weather_code: 45, is_day: 1 }).condition, 'fog');
  assert.equal(getSceneForWeather({ weather_code: 2, wind_gusts_10m: 51, is_day: 1 }).condition, 'wind');
});

test('rain and storms take priority over wind; night comes from the selected city', () => {
  assert.deepEqual(getSceneForWeather({ weather_code: 95, wind_speed_10m: 90, is_day: 0 }), { condition: 'storm', isNight: true });
  assert.deepEqual(getSceneForWeather({ weather_code: 61, wind_gusts_10m: 82, is_day: 0 }), { condition: 'rain', isNight: true });
  assert.deepEqual(getSceneForWeather({ weather_code: 0, temperature_2m: 28, is_day: 0 }), { condition: 'clear', isNight: true });
});

test('scene HTML comes from provided SVG and contains no demo weather controls', () => {
  const html = buildSceneHtml({ condition: 'rain', isNight: true });
  assert.match(html, /data-w="rain" data-night="true"/);
  assert.match(html, /id="rain"/);
  assert.match(html, /id="ripples"/);
  assert.match(html, /id="stage"/);
  assert.doesNotMatch(html, /id="replay"|id="auto"|id="switch"|<button/);
  assert.match(html, /window\.PULA/);
});

test('unknown condition is safely normalized and scene uses an offline HTML document', () => {
  const html = buildSceneHtml({ condition: '<script>', isNight: false });
  assert.match(html, /data-w="cloud" data-night="false"/);
  assert.doesNotMatch(html, /<script>.*<script>/s);
  assert.doesNotMatch(html, /src="https?:\/\//);
});

test('forecast requests wind gusts and cloud cover for real condition selection', () => {
  const current = new URL(buildForecastUrl(COUNTRIES.LS.cities[0])).searchParams.get('current');
  assert.ok(current.includes('is_day'));
  assert.ok(current.includes('wind_gusts_10m'));
  assert.ok(current.includes('cloud_cover'));
});
