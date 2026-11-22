const { mapDocument } = require('./mapHtmlCore');
function buildMapHtml(points, layer='temperature', selectedId=null) {
 const metrics=['temperature','precipitation','wind','cloud'];
 const initial=metrics.includes(layer)?layer:'temperature';
 const data={points:(points||[]).map(p=>({id:p.id,name:p.name,lat:p.lat,lon:p.lon,temperature:p.temperature,precipitation:p.precipitation,wind:p.wind,cloud:p.cloud})),initial,selectedId:selectedId||null};
 return mapDocument(data, `
let metric=DATA.initial;
const num=n=>typeof n==='number'&&isFinite(n);
const markers=[];
function label(p){const v=p[metric];return !num(v)?'—':metric==='temperature'?Math.round(v)+'°':metric==='precipitation'?Number(v).toFixed(1)+'mm':metric==='wind'?Math.round(v)+'km/h':Math.round(v)+'%';}
function fill(p){const v=p[metric];if(!num(v))return '#d6dee0';if(metric==='temperature')return v<10?'#a7d2f1':v<22?'#8bd3b7':v<30?'#f6d78c':'#eba675';if(metric==='precipitation')return v>2?'#3b82a0':v>0?'#84c4da':'#bcdcd4';if(metric==='wind')return v>45?'#e6a978':v>20?'#f4d49c':'#a9d8c4';return v>70?'#899aae':v>35?'#b9cdd4':'#dfe9dd';}
function makeIcon(p){return L.divIcon({html:'<div class="badge" style="background:'+fill(p)+'">'+label(p)+'</div>',className:'',iconSize:[69,34],iconAnchor:[34,17]});}
for(const p of DATA.points){if(!num(p.lat)||!num(p.lon))continue;const m=L.marker([p.lat,p.lon],{icon:makeIcon(p)}).addTo(map);const content=document.createElement('div');const heading=document.createElement('strong');heading.textContent=p.name;const details=document.createElement('p');details.textContent=label(p);const action=document.createElement('a');action.href='#';action.textContent='View this town’s forecast';action.addEventListener('click',e=>{e.preventDefault();window.ReactNativeWebView?.postMessage(JSON.stringify({type:'select-city',cityId:p.id}));});content.append(heading,details,action);m.bindPopup(content);markers.push({p,m,details});}
const sel=DATA.points.find(p=>p.id===DATA.selectedId);
if(sel)map.setView([sel.lat,sel.lon],8);
const pane=document.createElement('div');pane.className='weather-metrics';
const choices=[['temperature','Temp'],['precipitation','Rain'],['wind','Wind'],['cloud','Cloud']];
function setMetric(v){metric=v;for(const e of markers){e.m.setIcon(makeIcon(e.p));e.details.textContent=label(e.p);}for(const child of pane.children)child.classList.toggle('active',child.dataset.metric===v);}
for(const [key,title] of choices){const e=document.createElement('label');e.textContent=title;e.dataset.metric=key;e.className=key===metric?'active':'';e.setAttribute('role','button');e.setAttribute('tabindex','0');e.addEventListener('click',()=>setMetric(key));e.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();setMetric(key);}});pane.appendChild(e);}
document.body.appendChild(pane);
`);
}
module.exports={buildMapHtml};
