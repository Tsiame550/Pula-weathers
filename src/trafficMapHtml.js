const {mapDocument} = require('./mapHtmlCore');
/** Street/satellite layers are real basemaps; traffic overlays are served by PULA's server only when connected. */
function trafficMapHtml(city,incidents,connected,base) {
 const safeIncidents=(incidents||[]).filter(i=>Array.isArray(i.coordinates)&&i.coordinates.length===2);
 return mapDocument({city:{name:city.name,lat:city.lat,lon:city.lon},incidents:safeIncidents,connected:Boolean(connected),base:connected?base:''},`
map.setView([DATA.city.lat,DATA.city.lon],12);
if(DATA.connected&&DATA.base){map.createPane('liveTraffic');map.getPane('liveTraffic').style.zIndex=450;map.getPane('liveTraffic').style.pointerEvents='none';L.tileLayer(DATA.base+'/api/flow/{z}/{x}/{y}.png',{pane:'liveTraffic',maxNativeZoom:18,maxZoom:19,opacity:.81,attribution:'Traffic &copy; TomTom'}).addTo(map);}
for(const inc of DATA.incidents){const marker=L.marker(inc.coordinates,{icon:L.divIcon({html:'<div class="incident"></div>',className:'',iconSize:[20,20]})}).addTo(map);const box=document.createElement('div');const a=document.createElement('strong');a.textContent=inc.category||'Traffic incident';const desc=document.createElement('p');desc.textContent=inc.description||'';const road=document.createElement('small');road.textContent=inc.road||'';box.append(a,desc,road);marker.bindPopup(box);}
`);
}
function routeMapHtml(origin,destination,points){
 return mapDocument({from:{name:origin.name,lat:origin.lat,lon:origin.lon},to:{name:destination.name,lat:destination.lat,lon:destination.lon},points:points||[]},`
const first=L.marker([DATA.from.lat,DATA.from.lon]).addTo(map).bindTooltip('Start: '+DATA.from.name);
const last=L.marker([DATA.to.lat,DATA.to.lon]).addTo(map).bindTooltip('Destination: '+DATA.to.name);
const group=L.featureGroup([first,last]);
if(DATA.points.length>1){const road=L.polyline(DATA.points,{color:'#27866f',weight:5,opacity:.94}).addTo(map);group.addLayer(road);}
map.fitBounds(group.getBounds().pad(.28),{maxZoom:13,animate:false});
`);
}
module.exports={trafficMapHtml,routeMapHtml};
