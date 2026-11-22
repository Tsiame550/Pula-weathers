const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {COUNTRIES,cityMatchesSearch}=require('../src/cities');
const {buildMapHtml}=require('../src/mapHtml');
const {trafficMapHtml,routeMapHtml}=require('../src/trafficMapHtml');
const {createServer}=require('../server/server');
function scriptFromHtml(html){
  const match=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(match.length,'Inline map script exists');
  return match[match.length-1][1];
}
test('Leribe and Maputsoe are distinct selectable towns, with alias search',()=>{
 const cities=COUNTRIES.LS.cities;
 const h=cities.find(c=>c.id==='ls-hlotse'),m=cities.find(c=>c.id==='ls-maputsoe');
 assert.ok(h&&m);
 assert.ok(cityMatchesSearch(h,'leribe'));
 assert.ok(cityMatchesSearch(h,'hlotse'));
 assert.ok(cityMatchesSearch(m,'maputsoe'));
 assert.ok(cityMatchesSearch(m,'Leribe District'));
 assert.equal(cityMatchesSearch(m,'Soweto'),false);
 assert.ok(Math.abs(m.lat-(-28.886597))<0.0001);
 assert.ok(Math.abs(m.lon-27.899145)<0.0001);
});
test('the live traffic backend recognizes Maputsoe as a supported city',async()=>{
 const server=createServer({apiKey:'test',fetchImpl:async()=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>({incidents:[]})})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const r=await fetch(`http://127.0.0.1:${server.address().port}/api/traffic?cityId=ls-maputsoe`);assert.equal(r.status,200);assert.equal((await r.json()).cityId,'ls-maputsoe');}finally{await new Promise(r=>server.close(r));}
});
test('all maps have an in-place road/satellite switch, search and smooth pan/zoom',()=>{
 const places=COUNTRIES.LS.cities;
 const weather=buildMapHtml(places.map(c=>({...c,temperature:22})), 'temperature','ls-maputsoe');
 const traffic=trafficMapHtml(places[0],[],false,'');
 const travel=routeMapHtml(places[0],places[1],[]);
 for(const html of [weather,traffic,travel]){
  assert.match(html,/World_Imagery\/MapServer\/tile/);
  assert.match(html,/Esri, Maxar, Earthstar Geographics/);
  assert.match(html,/'Road':road,'Satellite':satellite/);
  assert.match(html,/touchZoom:true/);
  assert.match(html,/map\.flyTo/);
  assert.match(html,/Maputsoe/);
  assert.match(html,/wheelPxPerZoomLevel/);
  assert.doesNotMatch(html,/TOMTOM_API_KEY/);
  assert.doesNotThrow(()=>new vm.Script(scriptFromHtml(html)));
 }
 assert.match(weather,/function setMetric/);
 assert.match(weather,/markers.*setIcon|\.setIcon\(/);
});
test('map explorer detaches inline gestures and provides fullscreen independent modal',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../src/MapExplorer.js'),'utf8');
 assert.match(src,/pointerEvents="none"/);
 assert.match(src,/Modal visible=\{expanded\}/);
 assert.match(src,/Explore full screen/);
 assert.match(src,/onRequestClose/);
 const cityPicker=fs.readFileSync(path.join(__dirname,'../App.js'),'utf8');
 assert.match(cityPicker,/cityMatchesSearch\(item, citySearch\)/);
});
