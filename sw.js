const CACHE_NAME="redline-shell-v5";
const CIRCUIT_ASSET_CACHE="redline-circuit-assets-v1";
const SHELL=["./","./index.html"];
const OPENF1_CACHE="redline-openf1-v1";
const OPENF1_ORIGIN="https://api.openf1.org";
async function openF1NetworkFirst(request){
 const cache=await caches.open(OPENF1_CACHE),controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),7500);
 try{
  const response=await fetch(request,{signal:controller.signal});
  if(response.ok&&response.headers.get("content-type")?.includes("json")){
   try{await cache.put(request,response.clone());const keys=await cache.keys();if(keys.length>120)await Promise.all(keys.slice(0,keys.length-120).map(key=>cache.delete(key)))}catch(_){/* Storage pressure must never block a fresh API response. */}
  }
  return response;
 }catch(error){
  const saved=await cache.match(request);
  if(saved){const headers=new Headers(saved.headers);headers.set("X-Redline-Cache","offline-fallback");return new Response(await saved.arrayBuffer(),{status:saved.status,statusText:saved.statusText,headers});}
  return new Response(JSON.stringify({error:"OpenF1 unavailable and no saved response exists"}),{status:503,headers:{"Content-Type":"application/json","X-Redline-Cache":"miss"}});
 }finally{clearTimeout(timeout)}
}

self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("redline-shell-")&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
 const req=event.request;if(req.method!=="GET")return;
 const url=new URL(req.url),same=url.origin===self.location.origin;
 if(url.origin===OPENF1_ORIGIN&&url.pathname.startsWith("/v1/")){event.respondWith(openF1NetworkFirst(req));return;}
 // Cache the circuit-outline SVGs used by the Home circuit guide for offline visits.
 if(url.hostname==="raw.githubusercontent.com"&&url.pathname.startsWith("/f1db/f1-circuits-svg/")&&req.destination==="image"){
  event.respondWith(caches.open(CIRCUIT_ASSET_CACHE).then(async cache=>{
   const saved=await cache.match(req);
   const network=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const res=await fetch(req,{signal:controller.signal});if(res.ok||res.type==="opaque")cache.put(req,res.clone());return res}catch(e){return null}finally{clearTimeout(timer)}})();
   if(saved){event.waitUntil(network);return saved}
   const fresh=await network;if(fresh)return fresh;return new Response("",{status:503,statusText:"Circuit map unavailable offline"});
  }));
  return;
 }
 if(!same)return;
 if(req.mode==="navigate"){
  event.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put("./index.html",copy))}return res}).catch(async()=>await caches.match(req)||await caches.match("./index.html")||await caches.match("./")));
  return;
 }
 if(url.pathname.includes("/archive/")&&url.pathname.endsWith(".json")){
  event.respondWith(caches.open(CACHE_NAME).then(async cache=>{const saved=await cache.match(req);try{const fresh=await fetch(req);if(fresh.ok)cache.put(req,fresh.clone());return fresh}catch(e){if(saved)return saved;throw e}}));
  return;
 }
 if(url.pathname.endsWith("/sw.js"))return;
});
