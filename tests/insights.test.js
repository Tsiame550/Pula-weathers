const assert = require('node:assert/strict');
const test = require('node:test');
const { findRainWindow, getForecastAdvisories, getDailyBriefing, getFarmInsights, aqiLabel, nearestPresetCity } = require('../src/insights');
const { COUNTRIES } = require('../src/cities');
const { buildMapHtml } = require('../src/mapHtml');
const { buildAirQualityUrl, buildMapUrl, parseForecast } = require('../src/weather');

function mockForecast() {
  return {
    current:{ temperature_2m:20,weather_code:3,wind_gusts_10m:18 },
    today:{high:27,low:10,rainChance:78,rainMm:13,uvMax:9,et0:3.1},
    daily:[{ high:27,low:10,rainMm:13 }],
    hourly:[{time:'2026-11-22T06:00',rainChance:10},{time:'2026-11-22T07:00',rainChance:60},{time:'2026-11-22T08:00',rainChance:80},{time:'2026-11-22T09:00',rainChance:10}],
  };
}
test('first rain probability window is based on actual hourly probabilities',()=>{
  const rain=findRainWindow(mockForecast().hourly);
  assert.equal(rain.peak,80);
  assert.match(rain.text,/07:00 to 09:00/);
  assert.match(rain.text,/probability forecast/);
});
test('missing rainfall probabilities are not invented',()=>{
  assert.equal(findRainWindow([{time:'2026-11-22T06:00'}]).start,null);
  assert.match(findRainWindow([]).text,/unavailable/);
});
test('risk cards distinguish rules from official alerts',()=>{
  const f=mockForecast(); f.current.weather_code=95;f.current.wind_gusts_10m=80;
  const result=getForecastAdvisories(f);
  assert.ok(result.some(x=>x.id==='storm'));
  assert.ok(result.some(x=>x.id==='wind'));
  assert.match(getDailyBriefing(mockForecast(),'Maseru'),/Maseru/);
});
test('farming outlook reacts to frost and modelled rain',()=>{
  const f=mockForecast();f.daily[0].low=0;f.today.rainMm=34;
  const info=getFarmInsights(f);
  assert.equal(info.frostRisk,true);
  assert.equal(info.forecastRainMm,34);
});
test('AQI labels and opt-in nearest town selection',()=>{
  assert.equal(aqiLabel(25),'Good');
  assert.equal(aqiLabel(null),'Unavailable');
  assert.equal(nearestPresetCity(-29.316,27.483,COUNTRIES).id,'ls-maseru');
  assert.equal(nearestPresetCity(40,-74,COUNTRIES),null);
});
test('map HTML is limited to supplied city marker data, and has no weather radar claim',()=>{
  const html=buildMapHtml([{id:'ls-maseru',name:'Maseru',lat:-29.3,lon:27.4,temperature:20,precipitation:1.5,wind:8,cloud:50}], 'precipitation');
  assert.match(html,/Leaflet|leaflet/);
  assert.match(html,/OpenStreetMap/);
  assert.match(html,/select-city/);
  assert.doesNotMatch(html,/<button/);
});
test('extended endpoint queries request modelled air quality and city comparison',()=>{
  assert.match(buildAirQualityUrl(COUNTRIES.ZA.cities[0]),/us_aqi/);
  const mapUrl=buildMapUrl([...COUNTRIES.LS.cities.slice(0,2),...COUNTRIES.ZA.cities.slice(0,1)]);
  assert.match(decodeURIComponent(mapUrl),/latitude=-29.3167,-29.1472,-26.2041/);
});
test('extended forecast parser handles missing optional soil variables safely',()=>{
  const d=parseForecast({current:{time:'2026-11-22T05:00'},hourly:{time:['2026-11-22T05:00'],temperature_2m:[14]},daily:{time:['2026-11-22'],temperature_2m_min:[8]}});
  assert.equal(d.hourly.length,1);
  assert.equal(d.next24Hours[0].soilTemp,undefined);
});
