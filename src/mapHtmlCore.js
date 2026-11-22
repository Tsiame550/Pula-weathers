// Shared full-screen Leaflet map shell for PULA Weather, Traffic and Travel.
// Road tiles: OSM; satellite tiles: Esri World Imagery. Always display attribution.
// Check service terms/usage limits before any public/production deployment.
const { COUNTRIES } = require('./cities');
function json(value) {
  return JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
}
const cities = Object.values(COUNTRIES).flatMap(c=>c.cities.map(x=>({ id:x.id, name:x.name, region:x.region || c.name,lat:x.lat,lon:x.lon,aliases:x.aliases||[] })));
function mapDocument(payload, customCode) {
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
*{box-sizing:border-box}html,body,#map{width:100%;height:100%;margin:0;padding:0;overflow:hidden;overscroll-behavior:contain;touch-action:none}body{font:13px system-ui,-apple-system,sans-serif;background:#dce9e6;color:#153a32;-webkit-user-select:none;user-select:none}.leaflet-container{background:#dce9e6;touch-action:none!important}.leaflet-control-layers{border:0!important;border-radius:12px!important;box-shadow:0 3px 14px #1239!important;background:#fff!important;padding:6px 9px!important}.leaflet-control-layers label{font-weight:750;font-size:12px;margin:4px 0}.leaflet-control-zoom{border:0!important;box-shadow:0 2px 12px #1235!important}.leaflet-control-zoom a{border-radius:5px!important}.leaflet-control-attribution{font-size:9px!important;max-width:75vw}.search{position:absolute;top:12px;left:12px;width:min(54%,245px);z-index:1200;touch-action:manipulation}.search input{height:41px;width:100%;border:1px solid #d8e3dd;border-radius:11px;box-shadow:0 3px 12px #1235;background:#fff;color:#16362d;padding:10px 12px;font-size:13px;outline:0;touch-action:auto;-webkit-user-select:text;user-select:text}.search input:focus{border-color:#408c7a}.results{max-height:185px;overflow:auto;background:#fff;margin-top:3px;border-radius:10px;box-shadow:0 4px 14px #1235;touch-action:pan-y}.result{padding:10px 12px;border-bottom:1px solid #ebf1ed;cursor:pointer}.result:active{background:#d8f5e9}.result strong{display:block;font-size:12px}.result small{display:block;color:#758a83;font-size:10px}.weather-metrics{position:absolute;left:12px;bottom:36px;z-index:1100;display:flex;gap:4px;max-width:calc(100% - 24px);background:#fff;box-shadow:0 3px 15px #1235;padding:5px;border-radius:12px;touch-action:manipulation}.weather-metrics label{display:inline-block;padding:9px 10px;font-weight:750;border-radius:8px;font-size:10px;cursor:pointer}.weather-metrics label.active{background:#205e50;color:#fff}.weather-metrics input{display:none}.badge{min-width:35px;text-align:center;padding:6px 8px;border:2px solid white;border-radius:22px;font-weight:800;font-size:12px;color:#16332b;box-shadow:0 2px 8px #0005;white-space:nowrap}.incident{width:17px;height:17px;background:#d44b37;border:2px solid white;border-radius:100%;box-shadow:0 2px 7px #0007}.err{position:absolute;top:64px;left:12px;right:12px;z-index:1400;background:#fff;padding:13px;border-radius:10px;color:#234;font-size:12px}
</style></head><body><div id="map"></div><div class="search"><input type="search" id="find" placeholder="Find Leribe, Maputsoe, city…" autocomplete="off" aria-label="Find a town on the map"/><div class="results" id="matches" hidden></div></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
(function(){
const DATA=${json(payload)};
const CITIES=${json(cities)};
if(typeof L==='undefined'){document.body.insertAdjacentHTML('beforeend','<div class="err">Could not load map library. Check your internet connection.</div>');return;}
const map=L.map('map',{zoomControl:true,attributionControl:true,preferCanvas:true,minZoom:4,maxZoom:19,zoomSnap:.25,zoomDelta:.5,zoomAnimation:true,fadeAnimation:true,markerZoomAnimation:true,wheelPxPerZoomLevel:140,scrollWheelZoom:true,dragging:true,touchZoom:true,doubleClickZoom:true,boxZoom:true}).setView([-29.25,27.8],7);
const road=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxNativeZoom:19,maxZoom:19,attribution:'&copy; OpenStreetMap contributors'});
const satellite=L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:19,maxZoom:19,attribution:'Imagery &copy; Esri, Maxar, Earthstar Geographics, GIS User Community'});
road.addTo(map);
L.control.layers({'Road':road,'Satellite':satellite},null,{position:'topright',collapsed:false}).addTo(map);
// Full-screen map is isolated from the app scroll view. This protects pinch/pan gestures.
const input=document.getElementById('find'),results=document.getElementById('matches');
for(const el of [input,results]){L.DomEvent.disableClickPropagation(el);L.DomEvent.disableScrollPropagation(el);}
function choosePlace(city){results.hidden=true;input.value=city.name;map.flyTo([city.lat,city.lon],Math.max(12,map.getZoom()),{duration:.7});input.blur();}
function renderPlaces(found,note=''){
  results.replaceChildren(); results.hidden=false;
  for(const c of found.slice(0,10)){
    const row=document.createElement('div');row.className='result';row.setAttribute('role','button');row.setAttribute('tabindex','0');
    const strong=document.createElement('strong');strong.textContent=c.name;
    const sub=document.createElement('small');sub.textContent=c.region;
    row.append(strong,sub);row.addEventListener('click',()=>choosePlace(c));results.appendChild(row);
  }
  if(note){const status=document.createElement('div');status.className='result';status.style.color='#607a71';status.textContent=note;results.appendChild(status);}
}
let pending=null,queryToken=0;
input.addEventListener('input',()=>{
  const q=input.value.trim().toLowerCase();const token=++queryToken;
  if(pending){clearTimeout(pending);pending=null;}
  results.replaceChildren();if(!q){results.hidden=true;return;}
  const found=CITIES.filter(c=>[c.name,c.region,...c.aliases].some(v=>v&&v.toLowerCase().includes(q))).slice(0,9);
  renderPlaces(found,q.length>=3?'Looking for other places…':'Type at least 3 letters to find more places');
  if(q.length<3)return;
  pending=setTimeout(async()=>{
    try{
      const endpoint=code=>'https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(q)+'&count=12&language=en&format=json&countryCode='+code;
      const responses=await Promise.all(['LS','ZA'].map(async code=>{const r=await fetch(endpoint(code));if(!r.ok)throw new Error('Geocoding not available');return r.json();}));
      if(queryToken!==token)return;
      const extra=responses.flatMap(x=>x.results||[]).filter(x=>Number.isFinite(x.latitude)&&Number.isFinite(x.longitude)&&['LS','ZA'].includes(x.country_code)).map(x=>({name:x.name,region:[x.admin1,x.country].filter(Boolean).join(', '),lat:x.latitude,lon:x.longitude}));
      const unique=[...found];for(const item of extra){if(!unique.some(c=>Math.abs(c.lat-item.lat)<.008&&Math.abs(c.lon-item.lon)<.008))unique.push(item);}
      renderPlaces(unique,unique.length?'':'No matching places in Lesotho or South Africa');
    }catch(err){if(queryToken===token)renderPlaces(found,found.length?'More place search unavailable':'Place search unavailable. Check your connection.');}
  },500);
});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!results.hidden&&results.firstChild){e.preventDefault();results.firstChild.click();input.blur();}});
// Prevent parent webpage scrolling when pointer is inside the map iframe.
document.addEventListener('wheel',e=>{if(e.target.closest('#map'))e.preventDefault();},{passive:false});
${customCode}
setTimeout(()=>map.invalidateSize(),150);
})();
</script></body></html>`;
}
module.exports={mapDocument,json};
