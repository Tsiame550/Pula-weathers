const test=require('node:test');
const assert=require('node:assert/strict');
const { COUNTRIES }=require('../src/cities');
const {externalDirectionsUrl,normalizeRoute,trafficUrl,travelUrl,getTripWeatherAdvice,normalizeIncident}=require('../src/trafficTravel');
const {trafficMapHtml,routeMapHtml}=require('../src/trafficMapHtml');
const {createServer,transformIncidents,transformRoute,isRegionTile}=require('../server/server');
const maseru=COUNTRIES.LS.cities[0], joburg=COUNTRIES.ZA.cities[0];

test('driving link uses exact city coordinates and does not promise driving time',()=>{
 const link=externalDirectionsUrl(maseru,joburg);
 assert.match(link,/google\.com\/maps\/dir\//);
 assert.match(link,/travelmode=driving/);
 assert.match(link,/origin=-29\.3167%2C27\.4833/);
});
test('only configured backend can provide live traffic and routing',()=>{
 assert.equal(trafficUrl(maseru,''),null);
 assert.equal(travelUrl(maseru,joburg,''),null);
 assert.equal(trafficUrl(maseru,'https://pula.example'), 'https://pula.example/api/traffic?cityId=ls-maseru');
 assert.equal(travelUrl(maseru,joburg,'https://pula.example'),'https://pula.example/api/route?from=ls-maseru&to=za-johannesburg');
 assert.equal(travelUrl(maseru,maseru,'https://pula.example'),null);
});
test('no synthetic travel estimates are accepted',()=>{
 assert.equal(normalizeRoute(null),null);
 assert.equal(normalizeRoute({distanceMeters:500}),null);
 assert.equal(normalizeRoute({distanceMeters:80000,travelTimeSeconds:3600}).travelMinutes,60);
 assert.equal(normalizeIncident({description:'<script>test</script>',coordinates:[-29.3,27.5]}).description,'<script>test</script>');
});
test('road map escapes dangerous HTML and never invents a route geometry',()=>{
 const scene=trafficMapHtml(maseru,[{description:'</script>',coordinates:[-29,27],category:'Jam'}],false,'');
 assert.doesNotMatch(scene, /"description":"<\/script>/);
 const route=routeMapHtml(maseru,joburg,[]);
 assert.match(route,/DATA.points.length>1/);
 assert.match(route,/OpenStreetMap/);
});
test('trip weather only describes destination and does not fake route weather',()=>{
 const text=getTripWeatherAdvice({today:{rainChance:75,uvMax:9},current:{weather_code:95,wind_speed_10m:45},next24Hours:[]},'Johannesburg').join(' ');
 assert.match(text,/Rain is possible/);
 assert.match(text,/Thunderstorms/);
 assert.match(text,/winds/);
});
test('TomTom incident and route response mapping',()=>{
 const incidents=transformIncidents({incidents:[{properties:{id:'abc',iconCategory:8,events:[{description:'Road closed'}],delay:900,roadNumbers:['N1']},geometry:{type:'LineString',coordinates:[[28.00,-26.2],[28.01,-26.21]]}}]});
 assert.deepEqual(incidents[0].coordinates,[-26.2,28]);
 assert.equal(incidents[0].category,'Road closed');
 assert.equal(incidents[0].id,'abc');
 const route=transformRoute({routes:[{summary:{lengthInMeters:120000,travelTimeInSeconds:5400,trafficDelayInSeconds:300},legs:[{points:[{latitude:-29.3,longitude:27.4},{latitude:-29.1,longitude:27.6}]}]}]});
 assert.equal(route.travelTimeSeconds,5400);
 assert.equal(route.trafficDelaySeconds,300);
 assert.deepEqual(route.points[0],[-29.3,27.4]);
});
test('out-of-area raster flow tiles are rejected',()=>{
 assert.equal(isRegionTile(12,2044,1360),false);
 assert.equal(isRegionTile(1,0,0),false);
 assert.equal(isRegionTile(12,1000,1000),false);
});
test('backend without key never claims live traffic',async()=>{
 const server=createServer({apiKey:''});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {const r=await fetch(`http://127.0.0.1:${server.address().port}/api/traffic?cityId=ls-maseru`);assert.equal(r.status,503);assert.equal((await r.json()).connected,false);}
 finally {await new Promise(resolve=>server.close(resolve));}
});
test('backend proxies real-shaped API responses without exposing key',async()=>{
 const requests=[];
 const fakeFetch=async url=>{
   requests.push(url);
   if(url.includes('calculateRoute'))return {ok:true,headers:{get:()=> 'application/json'},json:async()=>({routes:[{summary:{lengthInMeters:50000,travelTimeInSeconds:2400,trafficDelayInSeconds:120},legs:[{points:[{latitude:-29.3167,longitude:27.4833},{latitude:-26.2,longitude:28.05}]}]}]})};
   return {ok:true,headers:{get:()=> 'application/json'},json:async()=>({incidents:[{properties:{id:'xy',iconCategory:9,events:[{description:'Work on road'}]},geometry:{type:'Point',coordinates:[27.5,-29.3]}}]})};
 };
 const server=createServer({apiKey:'mock-secret-only-on-server',fetchImpl:fakeFetch});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  const base=`http://127.0.0.1:${server.address().port}`;
  const incidentRes=await fetch(`${base}/api/traffic?cityId=ls-maseru`);assert.equal(incidentRes.status,200);
  const incident=await incidentRes.json();assert.equal(incident.incidents[0].category,'Roadworks');
  assert.equal(JSON.stringify(incident).includes('mock-secret'),false);
  const routeRes=await fetch(`${base}/api/route?from=ls-maseru&to=za-johannesburg`);assert.equal(routeRes.status,200);
  assert.equal((await routeRes.json()).trafficDelaySeconds,120);
  const invalid=await fetch(`${base}/api/route?from=unknown&to=ls-maseru`);assert.equal(invalid.status,400);
  assert.equal(requests.length,2);
 } finally {await new Promise(resolve=>server.close(resolve));}
});
