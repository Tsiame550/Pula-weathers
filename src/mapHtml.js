// Interactive city weather map. Colored markers reflect actual forecast values at
// named cities, not a continuous radar or satellite image.
function buildMapHtml(points, layer = 'temperature', selectedId = null) {
  const layers = ['temperature', 'precipitation', 'wind', 'cloud'];
  const safeLayer = layers.includes(layer) ? layer : 'temperature';
  const encoded = JSON.stringify((points || []).map(item => ({
    id: item.id, name: item.name, lat: item.lat, lon: item.lon,
    temperature: item.temperature, precipitation: item.precipitation,
    wind: item.wind, cloud: item.cloud
  }))).replace(/</g, '\\u003c');
  const safeId = JSON.stringify(selectedId || '').replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;width:100%;padding:0;margin:0;background:#d6e8e5}body{font-family:system-ui,sans-serif} .leaflet-container{background:#d8e7e7} .badge{min-width:28px;text-align:center;padding:7px 9px;border:2px solid #fff;border-radius:24px;font-weight:800;font-size:12px;color:#162a29;box-shadow:0 2px 10px #0005;white-space:nowrap}.error{position:absolute;z-index:9999;top:12px;left:12px;right:12px;background:white;color:#244;padding:12px;border-radius:12px;font-size:12px}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
(function(){
const points=${encoded},layer=${JSON.stringify(safeLayer)},selectedId=${safeId};
if(typeof L==='undefined'){document.body.insertAdjacentHTML('beforeend','<div class="error">Map library unavailable. Check the internet connection.</div>');return;}
const map=L.map('map',{zoomControl:true,attributionControl:true}).setView([-29.3,27.7],6);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
const valid = n=>typeof n==='number'&&isFinite(n);
function label(p){const v=p[layer];return valid(v) ? (layer==='temperature'?Math.round(v)+'°':layer==='precipitation'?v.toFixed(1)+'mm':layer==='wind'?Math.round(v)+'km/h':Math.round(v)+'%'):'—';}
function bg(p){const v=p[layer];if(!valid(v))return '#D6DEE0';if(layer==='temperature')return v<10?'#A7D2F1':v<22?'#8BD3B7':v<30?'#F6D78C':'#EBA675';if(layer==='precipitation')return v>2?'#3B82A0':v>0?'#84C4DA':'#BCDCD4';if(layer==='wind')return v>45?'#E6A978':v>20?'#F4D49C':'#A9D8C4';return v>70?'#899AAE':v>35?'#B9CDD4':'#DFE9DD';}
points.forEach(p=>{if(!valid(p.lat)||!valid(p.lon))return;
 const icon=L.divIcon({html:'<div class="badge" style="background:'+bg(p)+'">'+label(p)+'</div>',className:'',iconSize:[60,33],iconAnchor:[30,16]});
 const marker=L.marker([p.lat,p.lon],{icon}).addTo(map);
 marker.bindPopup('<strong>'+p.name.replace(/[<>&"]/g,'')+'</strong><br>'+label(p));
 marker.on('click',()=>window.ReactNativeWebView?.postMessage(JSON.stringify({type:'select-city',cityId:p.id})));
 if(selectedId===p.id) marker.openPopup();
});
})();
</script></body></html>`;
}
module.exports = { buildMapHtml };
