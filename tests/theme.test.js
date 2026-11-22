const assert = require('node:assert/strict');
const test = require('node:test');
const { getSceneForWeather } = require('../src/sceneMapping');
const { getWeatherTheme, palettes } = require('../src/weatherTheme');

function luminance(hex) {
  const rgb = hex.slice(1).match(/.{2}/g).map((chunk) => parseInt(chunk, 16) / 255);
  const linear = rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
}
function contrast(fg,bg) {
  const l1=luminance(fg),l2=luminance(bg);
  return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
}

test('every supported animation scene gets a distinct daytime color palette', () => {
  const keys = Object.keys(palettes);
  assert.deepEqual(keys.sort(), ['clear','hot','cloud','rain','storm','snow','wind','fog'].sort());
  assert.equal(new Set(keys.map(key => getWeatherTheme({ condition:key, isNight:false }).background)).size, 8);
});

test('night styling follows city weather is_day and retains the scene condition', () => {
  for (const code of [0, 3, 61, 71, 95, 45]) {
    const dayScene = getSceneForWeather({ weather_code:code, is_day:1 });
    const nightScene = getSceneForWeather({ weather_code:code, is_day:0 });
    const day = getWeatherTheme(dayScene);
    const night = getWeatherTheme(nightScene);
    assert.notEqual(day.background, night.background, `Scene ${code} should change at night`);
    assert.equal(day.condition, night.condition);
    assert.equal(day.statusBarStyle, ['rain','storm'].includes(dayScene.condition) ? 'light-content' : 'dark-content');
    assert.equal(night.statusBarStyle, 'light-content');
  }
});

test('main text, card text, hero text, and selected tabs maintain readable contrast', () => {
  for (const key of Object.keys(palettes)) {
    for (const isNight of [false,true]) {
      const t = getWeatherTheme({condition:key, isNight});
      for (const [fg,bg,label] of [
        [t.white,t.background,'main'],[t.white,t.card,'card'],
        [t.heroText,t.hero,'hero'],[t.accentInk,t.accent,'tab'],
        [t.muted,t.card,'muted']
      ]) {
        assert.ok(contrast(fg,bg) >= 4.5, `${key} night=${isNight} ${label} contrast=${contrast(fg,bg).toFixed(2)}`);
      }
    }
  }
});

test('invalid or missing weather scene falls back to a safe neutral palette', () => {
  assert.equal(getWeatherTheme(null).condition, 'cloud');
  assert.equal(getWeatherTheme({condition:'untrusted'}).condition, 'cloud');
});
