const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {withBridge}=require('../src/webBridge');
const {createServer}=require('../server/server');
const read=(p)=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('web adds the Expo Metro packages and the browser start script',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.scripts.web,'expo start --web');
 assert.equal(pkg.dependencies['react-dom'],'19.3.0');
 assert.match(pkg.dependencies['react-native-web'],/^~0\.21/);
 assert.match(pkg.dependencies['@expo/metro-runtime'],/^~58/);
 assert.equal(JSON.parse(read('app.json')).expo.web.bundler,'metro');
});
test('browser WebSurface uses isolated iframe and sends native-compatible city selection messages',()=>{
 const web=read('src/WebSurface.web.js');
 assert.match(web,/sandbox: 'allow-scripts allow-popups'/);
 assert.match(web,/event\.source !== ref\.current\?\.contentWindow/);
 assert.match(web,/onMessage\(\{ nativeEvent: \{ data: event\.data\.payload \} \}\)/);
 const map=withBridge('<html><head><title>Map</title></head><body><script>window.ReactNativeWebView.postMessage(JSON.stringify({type:"select-city",cityId:"ls-maseru"}))</script></body></html>');
 assert.match(map,/window\.ReactNativeWebView=/);
 assert.ok(map.indexOf('window.ReactNativeWebView=')<map.indexOf('<title>Map</title>'));
 assert.match(map,/__pulaBridge:true/);
});
test('web-only adapters keep Android notifications out of browser preview',()=>{
 assert.match(read('App.js'),/Platform\.OS === 'web' \|\| !preferences\.notificationsEnabled/);
 assert.match(read('src/notificationService.web.js'),/granted: false/);
 assert.match(read('src/locationService.web.js'),/navigator\.geolocation\.getCurrentPosition/);
 assert.match(read('src/WebSurface.native.js'),/react-native-webview/);
});
test('EAS preview profile is an APK, not an app bundle or already-built APK',()=>{
 const p=JSON.parse(read('eas.json')).build;
 assert.equal(p.preview.android.buildType,'apk');
 assert.equal(p.preview.developmentClient,false);
 assert.equal(p.production.android.buildType,'app-bundle');
});
test('traffic proxy allows local browser origin but does not allow arbitrary origins',async()=>{
 const server=createServer({apiKey:''});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try {
  const local=await fetch(base+'/health',{headers:{Origin:'http://localhost:8081'}});
  assert.equal(local.headers.get('access-control-allow-origin'),'http://localhost:8081');
  const unsafe=await fetch(base+'/health',{headers:{Origin:'https://untrusted.example'}});
  assert.equal(unsafe.headers.get('access-control-allow-origin'),null);
  assert.equal((await local.json()).trafficConfigured,false);
 } finally {await new Promise(resolve=>server.close(resolve));}
});
