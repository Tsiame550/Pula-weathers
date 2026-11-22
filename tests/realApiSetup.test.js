const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('../server/server');

test('real API diagnostic checks real provider URLs and does not contain a live secret',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../scripts/check-real-apis.js'),'utf8');
 assert.match(code,/buildForecastUrl/);
 assert.match(code,/buildAirQualityUrl/);
 assert.match(code,/\/api\/traffic\?cityId=/);
 assert.match(code,/\/api\/route\?from=/);
 assert.doesNotMatch(code,/TOMTOM_API_KEY/);
});
test('backend safely classifies TomTom authorization failures without leaking API key',async()=>{
 const server=createServer({apiKey:'a-sensitive-key',fetchImpl:async()=>({ok:false,status:403,headers:{get:()=> 'application/json'}})});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
   const r=await fetch(`http://127.0.0.1:${server.address().port}/api/traffic?cityId=ls-maseru`);
   assert.equal(r.status,502);
   const body=await r.json();
   assert.equal(body.code,'PROVIDER_AUTH');
   assert.match(body.error,/rejected the API key/);
   assert.ok(!JSON.stringify(body).includes('a-sensitive-key'));
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('backend distinguishes TomTom rate limits',async()=>{
 const server=createServer({apiKey:'a-sensitive-key',fetchImpl:async()=>({ok:false,status:429,headers:{get:()=> 'application/json'}})});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
   const r=await fetch(`http://127.0.0.1:${server.address().port}/api/traffic?cityId=ls-maseru`);
   assert.equal(r.status,429);
   const body=await r.json();
   assert.equal(body.code,'PROVIDER_RATE_LIMIT');
 }finally{await new Promise(resolve=>server.close(resolve));}
});
