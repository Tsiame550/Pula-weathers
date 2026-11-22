/** Node 20+ proxy. Keep TOMTOM_API_KEY on the server, never in an Expo bundle. */
const http = require('node:http');
const { URL } = require('node:url');
const { COUNTRIES } = require('../src/cities');
const cities = Object.values(COUNTRIES).flatMap(c => c.cities);
const cityById = id => cities.find(c => c.id === id);
const CATEGORY = {0:'Incident',1:'Accident',2:'Fog',3:'Dangerous conditions',4:'Rain',5:'Ice',6:'Traffic jam',7:'Lane closed',8:'Road closed',9:'Roadworks',10:'Wind',11:'Flooding',14:'Broken-down vehicle'};
const memory = new Map();
const LIMIT = 450;
// Basic per-process protection; deploy with gateway/auth and global rate limits.
const visitors = new Map();
function permitted(ip) {
  const now=Date.now(); const v=visitors.get(ip);
  if(!v || now-v.since>60_000) {visitors.set(ip,{since:now,count:1});return true;}
  v.count++; return v.count<=240;
}

function cached(key) { const c = memory.get(key); if (!c) return null; if (Date.now()>c.expires) {memory.delete(key);return null;} return c; }
function save(key, data, ageMs) { if (memory.size>LIMIT) memory.delete(memory.keys().next().value); memory.set(key,{data,expires:Date.now()+ageMs}); }
function bounds(city) { const west=Math.max(15,city.lon-.20),east=Math.min(35,city.lon+.20),south=Math.max(-36,city.lat-.18),north=Math.min(-21,city.lat+.18); return `${west},${south},${east},${north}`; }
function extractPoint(geo) {
  if (!geo || !Array.isArray(geo.coordinates)) return null;
  let p=geo.coordinates; while (Array.isArray(p) && Array.isArray(p[0])) p=p[0];
  return p.length>=2 && p.slice(0,2).every(Number.isFinite) ? [p[1],p[0]] : null;
}
function transformIncidents(data) {
  return (data.incidents||[]).map((item,i)=>{
    const p=item.properties||{};
    return { id:String(p.id||i), category:CATEGORY[p.iconCategory]||'Reported incident',
      description:String(p.events?.[0]?.description || CATEGORY[p.iconCategory] || 'Reported incident'),
      road:(p.roadNumbers||[]).join(', ') || p.from || '',
      delaySeconds:Number.isFinite(p.delay) ? p.delay:null,
      coordinates:extractPoint(item.geometry)
    };
  }).slice(0,80);
}
function transformRoute(data) {
  const route=data.routes?.[0];
  if (!route?.summary) throw new Error('No drivable route returned by the provider.');
  const s=route.summary;
  return {
    distanceMeters:s.lengthInMeters, travelTimeSeconds:s.travelTimeInSeconds,
    trafficDelaySeconds:s.trafficDelayInSeconds ?? null,
    points:(route.legs||[]).flatMap(leg=>(leg.points||[]).map(p=>[p.latitude,p.longitude])).filter(p=>p.every(Number.isFinite)),
    fetchedAt:new Date().toISOString()
  };
}
function isRegionTile(z,x,y) {
  if (!Number.isInteger(z)||z<4||z>18||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=2**z||y>=2**z) return false;
  // Tile centre must be in/near southern Africa. Prevent an open worldwide tile proxy.
  const lon=(x+.5)/2**z*360-180;
  const n=Math.PI-2*Math.PI*(y+.5)/2**z;
  const lat=180/Math.PI*Math.atan(Math.sinh(n));
  return lon>=15&&lon<=35&&lat>=-36&&lat<=-21;
}
function createServer({apiKey=process.env.TOMTOM_API_KEY,fetchImpl=fetch}={}) {
  async function provider(url) {
    const c=cached(url);
    if(c) return c.data;
    const response=await fetchImpl(url,{signal:AbortSignal.timeout(9000),headers:{Accept:'application/json,image/png'}});
    if(!response.ok) {
      const e=new Error(`Traffic provider HTTP ${response.status}`);
      e.status = response.status === 401 || response.status === 403 ? 502 : response.status === 429 ? 429 : 502;
      e.code = response.status === 401 || response.status === 403 ? 'PROVIDER_AUTH' : response.status === 429 ? 'PROVIDER_RATE_LIMIT' : 'PROVIDER_ERROR';
      throw e;
    }
    const contentType=response.headers.get('content-type')||'';
    const content=contentType.includes('image/png')?Buffer.from(await response.arrayBuffer()):await response.json();
    save(url, content, contentType.includes('image/png') ? 180000 : 60000);
    return content;
  }
  const allowedOrigins = new Set([
    'http://localhost:8081', 'http://127.0.0.1:8081',
    'http://localhost:19006', 'http://127.0.0.1:19006',
    ...(process.env.PULA_ALLOWED_WEB_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean)
  ]);
  return http.createServer(async (req,res)=>{
    const origin = req.headers.origin;
    const cors = allowedOrigins.has(origin) ? {'Access-Control-Allow-Origin':origin,'Vary':'Origin'} : {};
    const responseJson=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...cors});res.end(JSON.stringify(data));};
    if(req.method!=='GET') return responseJson(405,{error:'Method not allowed'});
    if(!permitted(req.socket.remoteAddress||'unknown')) return responseJson(429,{error:'Too many requests. Try again shortly.'});
    let parsed; try {parsed=new URL(req.url,'http://localhost');}catch(_){return responseJson(400,{error:'Invalid request'});}
    if(parsed.pathname==='/health') return responseJson(200,{ok:true,trafficConfigured:Boolean(apiKey)});
    if(!apiKey) return responseJson(503,{connected:false,error:'Traffic API is not connected yet.'});
    try {
      if(parsed.pathname==='/api/traffic') {
        const city=cityById(parsed.searchParams.get('cityId'));
        if(!city) return responseJson(400,{error:'Unknown supported city'});
        const fields='{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description},from,to,roadNumbers,delay}}}';
        const q=new URLSearchParams({key:apiKey,bbox:bounds(city),fields,language:'en-GB',timeValidityFilter:'present'});
        const data=await provider(`https://api.tomtom.com/traffic/services/5/incidentDetails?${q}`);
        return responseJson(200,{connected:true,cityId:city.id,incidents:transformIncidents(data),fetchedAt:new Date().toISOString()});
      }
      if(parsed.pathname==='/api/route') {
        const a=cityById(parsed.searchParams.get('from')), b=cityById(parsed.searchParams.get('to'));
        if(!a||!b||a.id===b.id) return responseJson(400,{error:'Choose two different supported cities'});
        const coords=`${a.lat},${a.lon}:${b.lat},${b.lon}`;
        const q=new URLSearchParams({key:apiKey,traffic:'true',travelMode:'car',routeType:'fastest'});
        const data=await provider(`https://api.tomtom.com/routing/1/calculateRoute/${coords}/json?${q}`);
        return responseJson(200,transformRoute(data));
      }
      const match=parsed.pathname.match(/^\/api\/flow\/(\d+)\/(\d+)\/(\d+)\.png$/);
      if(match) {
        const [z,x,y]=match.slice(1).map(Number);
        if(!isRegionTile(z,x,y)) return responseJson(400,{error:'Tile out of supported bounds'});
        const q=new URLSearchParams({key:apiKey,tileSize:'256'});
        const image=await provider(`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/${z}/${x}/${y}.png?${q}`);
        res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff',...cors});res.end(image);return;
      }
      return responseJson(404,{error:'Not found'});
    } catch(err){
      const error = err.code === 'PROVIDER_AUTH' ? 'TomTom rejected the API key or its permissions. Check Traffic and Routing API access.'
        : err.code === 'PROVIDER_RATE_LIMIT' ? 'TomTom rate limit reached. Try again later.'
        : 'Traffic provider request failed. Try again later.';
      return responseJson(err.status||502,{error,code:err.code||'PROVIDER_ERROR'});
    }
  });
}
if (require.main===module) {
  const port=Number(process.env.PORT)||3030;
  createServer().listen(port,'0.0.0.0',()=>console.log(`PULA traffic proxy ready on port ${port}`));
}
module.exports={createServer,bounds,transformIncidents,transformRoute,isRegionTile};
