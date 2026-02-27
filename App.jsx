import { useState, useMemo, useCallback, useEffect, useRef } from "react";

/* ═══════════════════════════ CONSTANTS ═══════════════════════════ */
const HQ = { lat: 38.5616, lng: -121.4686, label: "Hannibal's HQ" };
const TL_START = 300, TL_END = 1260;
const HR = ["5a","6a","7a","8a","9a","10a","11a","12p","1p","2p","3p","4p","5p","6p","7p","8p"];
const DEF_DRIVERS = [
  { id:"d1", name:"Driver 1", color:"#3b82f6", available:"05:00", end:"14:00" },
  { id:"d2", name:"Driver 2", color:"#f59e0b", available:"05:00", end:"14:00" },
  { id:"d3", name:"Driver 3", color:"#10b981", available:"07:00", end:"16:00" },
  { id:"d4", name:"Driver 4", color:"#ef4444", available:"10:00", end:"20:00" },
];
const KNOWN_COORDS = {
  "2335 stockton":{lat:38.5530,lng:-121.4530},"4610 x st":{lat:38.5505,lng:-121.4450},
  "8041 horseshoe":{lat:38.8200,lng:-121.1930},"8945 cal center":{lat:38.5580,lng:-121.3870},
  "1029 j st":{lat:38.5770,lng:-121.4930},"2800 l st":{lat:38.5690,lng:-121.4780},
  "8230 civic center":{lat:38.4090,lng:-121.3720},"1517 l st":{lat:38.5770,lng:-121.4870},
  "3130 bradshaw":{lat:38.5510,lng:-121.3560},"3000 q st":{lat:38.5680,lng:-121.4750},
  "1215 k st":{lat:38.5780,lng:-121.4930},"500 capitol":{lat:38.5800,lng:-121.5000},
  "1325 j st":{lat:38.5780,lng:-121.4880},"2035 hurley":{lat:38.5850,lng:-121.4200},
  "1600 exposition":{lat:38.5760,lng:-121.4270},"2700 stockton":{lat:38.5590,lng:-121.4530},
  "980 ninth":{lat:38.5785,lng:-121.4960},"980 9th":{lat:38.5785,lng:-121.4960},
};
const COMPLEXITY_OPTS = ["small","medium","large","large-event","vip","boxed","bar-event"];

/* ═══════════════════════════ UTILITIES ═══════════════════════════ */
function tm(t){if(!t)return 480;const[h,m]=t.split(":").map(Number);return h*60+m}
function fmt(m){const h=Math.floor(m/60),mn=m%60,ap=h>=12?"PM":"AM",h12=h===0?12:h>12?h-12:h;return`${h12}:${String(mn).padStart(2,"0")} ${ap}`}
function fmtShort(m){const h=Math.floor(m/60),mn=m%60,ap=h>=12?"p":"a",h12=h===0?12:h>12?h-12:h;return mn===0?`${h12}${ap}`:`${h12}:${String(mn).padStart(2,"0")}${ap}`}
function hvMi(a,b){const R=3959,dL=((b.lat-a.lat)*Math.PI)/180,dG=((b.lng-a.lng)*Math.PI)/180;const x=Math.sin(dL/2)**2+Math.cos((a.lat*Math.PI)/180)*Math.cos((b.lat*Math.PI)/180)*Math.sin(dG/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function fbDrive(a,b){const d=hvMi(a,b);return Math.ceil((d/(d>15?38:d>5?28:20))*60)+4}
function loadMin(c){return c==="large"||c==="large-event"?30:c==="vip"||c==="bar-event"?25:c==="medium"?18:12}
function cBadge(c){const m={large:["LRG","#fca5a5","#7f1d1d"],"large-event":["EVENT","#fca5a5","#7f1d1d"],vip:["VIP","#fbbf24","#78350f"],medium:["MED","#93c5fd","#1e3a5f"],boxed:["BOX","#86efac","#14532d"],small:["SM","#86efac","#14532d"],"bar-event":["BAR","#c4b5fd","#3b1f6e"]};return m[c]||["?","#999","#333"]}
function gCD(cache,a,b){const k=`${a.lat.toFixed(4)},${a.lng.toFixed(4)}->${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;return cache[k]!=null?cache[k]:fbDrive(a,b)}
function guessCo(addr){const l=addr.toLowerCase();for(const[p,c]of Object.entries(KNOWN_COORDS))if(l.includes(p))return c;return{lat:38.575+(Math.random()-.5)*.04,lng:-121.49+(Math.random()-.5)*.04}}
function guessComplex(g,t){const l=t.toLowerCase();if(l.includes("vip")||l.includes("china place")||l.includes("décor package"))return"vip";if(l.includes("bar service")||l.includes("bartender"))return"bar-event";if(l.includes("box"))return"boxed";if(l.includes("hors d")||l.includes("ceremony"))return g>=80?"large-event":"medium";if(g>=100)return"large";if(g>=25)return"medium";return"small"}
function guessSetup(c,g){return c==="large"||c==="large-event"?g>100?45:35:c==="vip"?30:c==="bar-event"?40:c==="boxed"?10:c==="medium"?20:15}
function cleanAddress(raw){let s=raw;s=s.replace(/https?:\/\/[^\s]+/gi,"");s=s.replace(/Kitchen\s*Sheet\s*Report/gi,"");s=s.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g,"");s=s.replace(/\d{1,2}:\d{2}\s*(AM|PM)/gi,"");s=s.replace(/\d*(st|nd|rd|th)\s*Floor\b[^,]*/gi,"");s=s.replace(/\bConference\s*Room[^,]*/gi,"");s=s.replace(/\bRoom\s*#?\s*\d+[^,]*/gi,"");s=s.replace(/type=\w+[^\s]*/gi,"");s=s.replace(/\b\d{1,2}\/\d{1,2}\b/g,"");s=s.replace(/\s{2,}/g," ").trim();s=s.replace(/^[,\s]+|[,\s]+$/g,"");return s}
function extractRoom(raw){const p=[];const f=raw.match(/(\d*(?:st|nd|rd|th)\s*Floor\b[^,]*)/i);if(f)p.push(f[1].trim());const c=raw.match(/(Conference\s*Room[^,]*)/i);if(c)p.push(c[1].trim());const r=raw.match(/(Room\s*#?\s*\d+[^,]*)/i);if(r&&!p.some(x=>x.includes(r[1])))p.push(r[1].trim());return p.join(", ")}
function parsePickup(t){const l=t.toLowerCase();if(l.includes("next day pickup")||l.includes("next-day pick"))return{type:"next-day",window:"10:00-16:00",note:"Next Day Pickup 10AM-4PM"};const m=l.match(/same\s*day\s*(pickup|pick[\s-]*up)\s*(\d{1,2})\s*(am|pm)\s*[-–]\s*(\d{1,2})\s*(am|pm)/i);if(m){let sh=parseInt(m[2]);if(m[3].toLowerCase()==="pm"&&sh<12)sh+=12;let eh=parseInt(m[4]);if(m[5].toLowerCase()==="pm"&&eh<12)eh+=12;return{type:"same-day",window:`${String(sh).padStart(2,"0")}:00-${String(eh).padStart(2,"0")}:00`,note:`Same Day Pickup ${m[2]}${m[3]}-${m[4]}${m[5]}`}}if(l.includes("same day")||l.includes("same-day"))return{type:"same-day",window:"10:00-16:00",note:"Same Day Pickup 10AM-4PM"};if(l.includes("equipment pick")||l.includes("cambro"))return{type:"same-day",window:"10:00-16:00",note:"Equipment Pickup"};if(l.includes("server")&&(l.includes("cleanup")||l.includes("replenish")))return{type:"server-cleanup",window:"17:00-20:00",note:"Server handles cleanup"};return null}
function dateStr(d){return d.toISOString().split("T")[0]}
function friendlyDate(s){const d=new Date(s+"T12:00:00");return d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}

/* ═══════════════════════════ PDF PARSER ═══════════════════════════ */
async function loadPdfJs(){if(window.pdfjsLib)return window.pdfjsLib;return new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";s.onload=()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";res(window.pdfjsLib)};s.onerror=rej;document.head.appendChild(s)})}
async function extractPdf(file){const lib=await loadPdfJs();const buf=await file.arrayBuffer();const pdf=await lib.getDocument({data:buf}).promise;let txt="";for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i);const tc=await pg.getTextContent();txt+=tc.items.map(x=>x.str).join(" ")+"\n---PB---\n"}return txt}
function parseCaterTrax(text){const orders=[];const chunks=text.split(/(?=Order\s*ID\s*:\s*\d+)/i);for(const chunk of chunks){if(chunk.trim().length<50)continue;const idM=chunk.match(/Order\s*ID\s*:\s*(\d+)/i);if(!idM)continue;const id=idM[1];const gM=chunk.match(/Guest\s*Count\s*:\s*(\d+)/i);const guests=gM?parseInt(gM[1]):0;if(!guests)continue;const coM=chunk.match(/Company\/Event\s*Type\s*:\s*([^\n]+)/i);let company=coM?coM[1].trim().replace(/\s{2,}/g," ").substring(0,50):"Unknown";const dM=chunk.match(/Delivery\s*Time\s*Btw\s*:\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i)||chunk.match(/Food\s*Arrival\s*Time\s*:\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);let dTime="08:00";if(dM){let h=parseInt(dM[1]);if(dM[3].toUpperCase()==="PM"&&h<12)h+=12;if(dM[3].toUpperCase()==="AM"&&h===12)h=0;dTime=`${String(h).padStart(2,"0")}:${dM[2]}`}const sM=chunk.match(/Serving\s*Time\s*:\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);let sTime=dTime;if(sM){let h=parseInt(sM[1]);if(sM[3].toUpperCase()==="PM"&&h<12)h+=12;if(sM[3].toUpperCase()==="AM"&&h===12)h=0;sTime=`${String(h).padStart(2,"0")}:${sM[2]}`}let event="";const evM=chunk.match(/Company\/Event\s*Type\s*:\s*[^\n]+\n\s*([^\n]+)/i);if(evM)event=evM[1].trim().substring(0,60);const ev2=chunk.match(/Event\s*Title\s+([^\n]+)/i);if(ev2)event=ev2[1].trim();if(!event||event.length<3)event=company;const ctM=chunk.match(/On\s*Site\s*Contact\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);const contact=ctM?ctM[1].trim():"";const phM=chunk.match(/On\s*Site\s*Contact\s*Phone\s+([\d\-().x\s]+)/i);const phone=phM?phM[1].trim().substring(0,20):"";const adM=chunk.match(/Delivery\s*Address\s+([^\n]+)/i);const ciM=chunk.match(/Delivery\s*Address\s+[^\n]+\n.*?City\s+([^\n]+)/i);const ziM=chunk.match(/Zip\s*Code\s*(\d{5})/i);let address="";let roomFromAddr="";if(adM){const rawAddr=adM[1].trim();roomFromAddr=extractRoom(rawAddr);const cleaned=cleanAddress(rawAddr);const city=ciM?cleanAddress(ciM[1].trim()):"Sacramento";const zip=ziM?ziM[1]:"";address=`${cleaned}, ${city}, CA ${zip}`.replace(/,\s*,/g,",").replace(/,\s*$/,"").trim()}const rmM=chunk.match(/Floor\/Room#?\s+([^\n]+)/i);const room=rmM?rmM[1].trim().substring(0,80):(roomFromAddr||"");const rpM=chunk.match(/Sales\s*Associate\s+([^\n]+)/i);const salesRep=rpM?rpM[1].trim():"";const msM=chunk.match(/MASTER\s*INVOICE\s*#?\s*(\d+)/i);const menuParts=[];const fSec=chunk.match(/(?:HOT\s*FOOD|COLD\s*FOOD|BAKERY).*?(?=QTY|BEVERAGE|SERVICE|EQUIPMENT|Special|Customer|$)/gis);if(fSec)fSec.forEach(s=>{const items=s.match(/(?:\d+\s+)?([A-Z][A-Za-z\s&''`,~*()\/\-]+(?:with|and|served|includes)[^\n]*)|(?:\d+\s+)?([A-Z][A-Za-z\s&''`,~*()\/\-]{8,})/g);if(items)items.forEach(it=>{const cl=it.replace(/^\d+\s+/,"").trim();if(cl.length>5&&!/^(QTY|HOT|COLD|KITCHEN|NOTES|Package|NEED)/i.test(cl))menuParts.push(cl.substring(0,100))})});if(!menuParts.length){const fl=chunk.match(/\d+\s+([A-Z][a-zA-Z\s&'',~*()\/\-]{10,})/g);if(fl)fl.slice(0,5).forEach(l=>{const cl=l.replace(/^\d+\s+/,"").trim();if(!/^(Package|Service|Basic|Décor|Out of|After|Beverage)/i.test(cl))menuParts.push(cl.substring(0,100))})}const menu=menuParts.length?menuParts.join(", "):"See order details";const np=[];const kn=chunk.match(/KITCHEN\s*NOTES?\s*([^\n]*(?:\n(?!QTY|Customer|Special)[^\n]*){0,3})/gi);if(kn)kn.forEach(n=>{const c=n.replace(/KITCHEN\s*NOTES?\s*/i,"").trim();if(c.length>3)np.push(c)});const spM=chunk.match(/Special\s*Instructions\s*([^\n]+(?:\n(?!Customer)[^\n]+){0,2})/i);if(spM)np.push(spM[1].trim());if(/no\s*sterno/i.test(chunk))np.push("NO STERNOS");if(/vip/i.test(chunk)&&!np.some(n=>/vip/i.test(n)))np.push("VIP CLIENT");const notes=[...new Set(np)].join(" · ").substring(0,300);const pickup=parsePickup(chunk);const coords=guessCo(address);const complexity=guessComplex(guests,chunk);const setupMinutes=guessSetup(complexity,guests);orders.push({id,company,event,contact,phone,address,lat:coords.lat,lng:coords.lng,guests,deliveryTime:dTime,servingTime:sTime,setupMinutes,menu,notes,pickup,salesRep,complexity,room})}return orders}

/* ═══════════════════════════ SUPABASE ═══════════════════════════ */
function getSupaConfig(){try{const s=localStorage.getItem("hd_supa");return s?JSON.parse(s):null}catch{return null}}
function setSupaConfig(url,key){localStorage.setItem("hd_supa",JSON.stringify({url,key}))}

async function supaFetch(path,opts={}){
  const cfg=getSupaConfig();if(!cfg)return null;
  const url=`${cfg.url}/rest/v1${path}`;
  const headers={"apikey":cfg.key,"Authorization":`Bearer ${cfg.key}`,"Content-Type":"application/json","Prefer":opts.prefer||"return=representation"};
  try{
    const r=await fetch(url,{...opts,headers:{...headers,...(opts.headers||{})}});
    if(!r.ok){const t=await r.text();console.error("Supabase error:",r.status,t);return null}
    const t=await r.text();return t?JSON.parse(t):null;
  }catch(e){console.error("Supabase fetch error:",e);return null}
}

async function loadDispatchDay(date){
  const data=await supaFetch(`/dispatch_days?dispatch_date=eq.${date}&select=*`);
  return data&&data.length>0?data[0]:null;
}

async function saveDispatchDay(date,orders,assignments,drivers){
  const existing=await loadDispatchDay(date);
  const body={dispatch_date:date,orders,assignments,drivers,updated_at:new Date().toISOString()};
  if(existing){
    return await supaFetch(`/dispatch_days?id=eq.${existing.id}`,{method:"PATCH",body:JSON.stringify(body)});
  }else{
    return await supaFetch("/dispatch_days",{method:"POST",body:JSON.stringify(body)});
  }
}

async function loadHistory(){
  return await supaFetch("/dispatch_days?select=id,dispatch_date,orders,updated_at&order=dispatch_date.desc&limit=60");
}

async function deleteDispatchDay(id){
  return await supaFetch(`/dispatch_days?id=eq.${id}`,{method:"DELETE"});
}

/* ═══════════════════════════ SCHEDULING ENGINE ═══════════════════════════ */
function optRoute(picks,dc){if(picks.length<=1)return picks;const vis=new Set;const rt=[];let cur=HQ;while(rt.length<picks.length){let b=null,bd=Infinity;for(const p of picks){if(vis.has(p.id))continue;const d=gCD(dc,cur,p);if(d<bd){bd=d;b=p}}if(!b)break;vis.add(b.id);rt.push(b);cur=b}return rt}
function groupPickups(picks,dc){const bw={};picks.forEach(p=>{const k=p.pickup.window;if(!bw[k])bw[k]=[];bw[k].push(p)});const runs=[];Object.entries(bw).forEach(([w,items])=>{const opt=optRoute(items,dc);if(!opt.length)return;let td=gCD(dc,HQ,opt[0]);for(let i=1;i<opt.length;i++)td+=gCD(dc,opt[i-1],opt[i]);td+=gCD(dc,opt[opt.length-1],HQ);const tp=opt.reduce((s,o)=>s+(o.guests>100?15:o.complexity==="vip"?12:8),0);const[ws,we]=w.split("-");runs.push({window:w,windowStart:tm(ws),windowEnd:tm(we),stops:opt,totalDrive:td,totalPickupTime:tp,totalTime:td+tp})});return runs.sort((a,b)=>a.windowStart-b.windowStart)}
function autoAssign(orders,drivers,dc){if(!orders.length)return{};const sorted=[...orders].sort((a,b)=>tm(a.deliveryTime)-tm(b.deliveryTime));const asgn={};const dt={};drivers.forEach(d=>{dt[d.id]={t:tm(d.available),lat:HQ.lat,lng:HQ.lng}});const farG={};sorted.forEach(o=>{if(hvMi(HQ,o)>12){const k=`${o.lat.toFixed(2)},${o.lng.toFixed(2)}`;if(!farG[k])farG[k]=[];farG[k].push(o)}});const batched=new Set;Object.values(farG).forEach(g=>{if(g.length<2)return;const best=drivers.reduce((b,d)=>{const dr=gCD(dc,HQ,g[0]);const need=tm(g[0].deliveryTime)-dr-loadMin(g[0].complexity);if(dt[d.id].t<=need&&(!b||dt[d.id].t<=dt[b.id].t))return d;return b||d},null);g.forEach(o=>{asgn[o.id]=best.id;batched.add(o.id)});const last=g[g.length-1];dt[best.id].t=tm(last.deliveryTime)+last.setupMinutes+15+gCD(dc,last,HQ);dt[best.id].lat=HQ.lat;dt[best.id].lng=HQ.lng});sorted.filter(o=>!batched.has(o.id)).forEach(o=>{let best=null,bs=Infinity;drivers.forEach(d=>{if(tm(d.end)<tm(o.deliveryTime)+o.setupMinutes)return;const s=dt[d.id];const dr=gCD(dc,{lat:s.lat,lng:s.lng},o);const dep=s.t+loadMin(o.complexity);const arr=dep+dr;const slack=tm(o.deliveryTime)-arr;if(slack<-15)return;const sc=dr+Math.max(0,slack)*.4+(slack<0?Math.abs(slack)*6:0);if(sc<bs){bs=sc;best=d}});if(!best)best=drivers[0];asgn[o.id]=best.id;const dr=gCD(dc,{lat:dt[best.id].lat,lng:dt[best.id].lng},o);dt[best.id].t=Math.max(dt[best.id].t+loadMin(o.complexity)+dr,tm(o.deliveryTime))+o.setupMinutes;dt[best.id].lat=o.lat;dt[best.id].lng=o.lng});return asgn}
function buildSched(orders,asgn,drivers,dc){const s={};drivers.forEach(d=>{s[d.id]=[]});const g={};drivers.forEach(d=>{g[d.id]=[]});orders.forEach(o=>{const did=asgn[o.id];if(did&&g[did])g[did].push(o)});Object.keys(g).forEach(did=>{const ords=g[did].sort((a,b)=>tm(a.deliveryTime)-tm(b.deliveryTime));let cur={lat:HQ.lat,lng:HQ.lng},t=tm(drivers.find(d=>d.id===did).available);ords.forEach(o=>{const ld=loadMin(o.complexity),dr=gCD(dc,cur,o),dl=tm(o.deliveryTime);const ls=Math.max(t,dl-dr-ld-10),dep=ls+ld,arr=dep+dr;s[did].push({type:"load",orderId:o.id,start:ls,duration:ld,label:`Load ${o.company}`,detail:`${o.guests}p`});s[did].push({type:"drive",orderId:o.id,start:dep,duration:dr,label:`→ ${o.company}`,detail:`${dr}min`});s[did].push({type:"setup",orderId:o.id,start:arr,duration:o.setupMinutes,label:`Setup: ${o.event}`,detail:`${o.guests}p`});t=arr+o.setupMinutes;cur={lat:o.lat,lng:o.lng}});if(ords.length){const ret=gCD(dc,cur,HQ);s[did].push({type:"return",start:t,duration:ret,label:"→ HQ",detail:`${ret}min`})}});return s}

/* ═══════════════════════════ LEAFLET MAP ═══════════════════════════ */
async function loadLeaflet(){if(window.L)return window.L;return new Promise((res,rej)=>{const css=document.createElement("link");css.rel="stylesheet";css.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";document.head.appendChild(css);const js=document.createElement("script");js.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";js.onload=()=>res(window.L);js.onerror=rej;document.head.appendChild(js)})}
async function fetchOSRM(wps){if(wps.length<2)return null;const coords=wps.map(w=>`${w.lng},${w.lat}`).join(";");try{const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);const d=await r.json();if(d.code==="Ok"&&d.routes?.[0]?.geometry?.coordinates)return d.routes[0].geometry.coordinates.map(([lng,lat])=>[lat,lng])}catch(e){console.warn("OSRM:",e)}return null}

function MapView({orders,assignments,drivers,pickupRuns,driveCache}){
  const mapRef=useRef(null),mapInst=useRef(null),layers=useRef({lines:[],markers:[]});
  const[mode,setMode]=useState("delivery"),[loading,setLoading]=useState(true),[selDriver,setSelDriver]=useState("all"),[routePanel,setRoutePanel]=useState(null);
  const deliveryRoutes=useMemo(()=>{const r={};drivers.forEach(d=>{r[d.id]=[]});orders.forEach(o=>{const did=assignments[o.id];if(did&&r[did])r[did].push(o)});Object.keys(r).forEach(did=>r[did].sort((a,b)=>tm(a.deliveryTime)-tm(b.deliveryTime)));return r},[orders,assignments,drivers]);
  useEffect(()=>{let dead=false;(async()=>{const L=await loadLeaflet();if(dead||!mapRef.current)return;if(mapInst.current){mapInst.current.remove();mapInst.current=null}const map=L.map(mapRef.current,{zoomControl:true}).setView([HQ.lat,HQ.lng],11);mapInst.current=map;L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{attribution:'&copy; OSM &copy; CARTO',maxZoom:19}).addTo(map);const hqIcon=L.divIcon({html:`<div style="width:30px;height:30px;background:#f59e0b;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;color:#000;box-shadow:0 2px 10px rgba(0,0,0,.5)">H</div>`,className:"",iconSize:[30,30],iconAnchor:[15,15]});L.marker([HQ.lat,HQ.lng],{icon:hqIcon}).bindPopup("<b>Hannibal's HQ</b>").addTo(map);setLoading(false)})();return()=>{dead=true;if(mapInst.current){mapInst.current.remove();mapInst.current=null}};},[]);
  useEffect(()=>{if(!mapInst.current||loading)return;const L=window.L,map=mapInst.current;layers.current.lines.forEach(l=>map.removeLayer(l));layers.current.markers.forEach(l=>map.removeLayer(l));layers.current={lines:[],markers:[]};
    const mkr=(lat,lng,color,label,pop,sz=22)=>{const icon=L.divIcon({html:`<div style="width:${sz}px;height:${sz}px;background:${color};border:2px solid rgba(255,255,255,.85);border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff">${label}</div>`,className:"",iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]});const m=L.marker([lat,lng],{icon}).addTo(map);if(pop)m.bindPopup(pop,{maxWidth:280});layers.current.markers.push(m)};
    if(mode==="delivery"){const dids=selDriver==="all"?drivers.map(d=>d.id):[selDriver];const pts=[[HQ.lat,HQ.lng]];dids.forEach(did=>{const dr=drivers.find(d=>d.id===did);if(!dr)return;const ords=deliveryRoutes[did]||[];if(!ords.length)return;const wps=[HQ,...ords];const ll=wps.map(w=>[w.lat,w.lng]);pts.push(...ll);const dash=L.polyline(ll,{color:dr.color,weight:3,opacity:0.35,dashArray:"8,6"}).addTo(map);layers.current.lines.push(dash);const openPanel=()=>setRoutePanel({type:"delivery",driverId:did,driverName:dr.name,driverColor:dr.color,stops:ords});dash.on("click",openPanel);fetchOSRM(wps).then(rc=>{if(!rc||!mapInst.current)return;map.removeLayer(dash);const i=layers.current.lines.indexOf(dash);if(i>-1)layers.current.lines.splice(i,1);const road=L.polyline(rc,{color:dr.color,weight:4,opacity:0.85}).addTo(map);road.on("click",openPanel);layers.current.lines.push(road)});ords.forEach((o,i)=>{const drv=gCD(driveCache,i===0?HQ:ords[i-1],o);mkr(o.lat,o.lng,dr.color,i+1,`<div style="font-family:'DM Sans',sans-serif;font-size:12px;line-height:1.6"><b style="font-size:14px">${o.company}</b><br/>${o.event}<br/>🕐 <b>${fmtShort(tm(o.deliveryTime))}</b> · ${o.guests}p · ${o.setupMinutes}min<br/>🚐 ~${drv}min · 📍 ${o.address.split(",")[0]}<br/>👤 ${o.contact} ${o.phone}</div>`)})});if(pts.length>1)map.fitBounds(L.latLngBounds(pts).pad(0.1))}
    if(mode==="pickup"){const pts=[[HQ.lat,HQ.lng]];const cols=["#22c55e","#06b6d4","#a855f7"];pickupRuns.forEach((run,ri)=>{const col=cols[ri%3];const wps=[HQ,...run.stops,HQ];const ll=wps.map(w=>[w.lat,w.lng]);pts.push(...ll);const dash=L.polyline(ll,{color:col,weight:3,opacity:0.35,dashArray:"8,6"}).addTo(map);layers.current.lines.push(dash);const openPanel=()=>setRoutePanel({type:"pickup",runIndex:ri,color:col,windowStart:run.windowStart,windowEnd:run.windowEnd,stops:run.stops,totalDrive:run.totalDrive,totalPickupTime:run.totalPickupTime,totalTime:run.totalTime});dash.on("click",openPanel);fetchOSRM(wps).then(rc=>{if(!rc||!mapInst.current)return;map.removeLayer(dash);const idx=layers.current.lines.indexOf(dash);if(idx>-1)layers.current.lines.splice(idx,1);const road=L.polyline(rc,{color:col,weight:4,opacity:0.85}).addTo(map);road.on("click",openPanel);layers.current.lines.push(road)});run.stops.forEach((st,si)=>{const drv=gCD(driveCache,si===0?HQ:run.stops[si-1],st);mkr(st.lat,st.lng,col,si+1,`<div style="font-family:'DM Sans',sans-serif;font-size:12px;line-height:1.6"><b>📦 ${st.company}</b><br/>⏰ ${fmtShort(run.windowStart)}–${fmtShort(run.windowEnd)}<br/>🚐 ~${drv}min · 📍 ${st.address.split(",")[0]}</div>`)})});if(pts.length>1)map.fitBounds(L.latLngBounds(pts).pad(0.1))}
  },[mode,selDriver,orders,assignments,drivers,deliveryRoutes,pickupRuns,loading,driveCache]);
  return(<div style={{flex:1,display:"flex",position:"relative"}}>
    <div style={{flex:1,position:"relative"}}>
      <div style={{position:"absolute",top:12,left:12,zIndex:1000,display:"flex",gap:8,flexWrap:"wrap"}}>
        <div style={{background:"#1c2029ee",border:"1px solid #2a3242",borderRadius:8,padding:5,display:"flex",gap:2}}>
          <button onClick={()=>{setMode("delivery");setRoutePanel(null)}} style={{padding:"6px 14px",borderRadius:5,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600,background:mode==="delivery"?"#262d3a":"transparent",color:mode==="delivery"?"#f59e0b":"#7b879c"}}>🚐 Delivery</button>
          <button onClick={()=>{setMode("pickup");setRoutePanel(null)}} style={{padding:"6px 14px",borderRadius:5,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600,background:mode==="pickup"?"#262d3a":"transparent",color:mode==="pickup"?"#22c55e":"#7b879c"}}>📦 Pickup</button>
        </div>
        {mode==="delivery"&&<div style={{background:"#1c2029ee",border:"1px solid #2a3242",borderRadius:8,padding:5,display:"flex",gap:2}}>
          <button onClick={()=>setSelDriver("all")} style={{padding:"5px 10px",borderRadius:4,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:600,background:selDriver==="all"?"#262d3a":"transparent",color:selDriver==="all"?"#f0f2f7":"#7b879c"}}>All</button>
          {drivers.map(d=>{const c=(deliveryRoutes[d.id]||[]).length;if(!c)return null;return<button key={d.id} onClick={()=>{setSelDriver(d.id);setRoutePanel({type:"delivery",driverId:d.id,driverName:d.name,driverColor:d.color,stops:deliveryRoutes[d.id]})}} style={{padding:"5px 10px",borderRadius:4,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:600,background:selDriver===d.id?"#262d3a":"transparent",color:selDriver===d.id?d.color:"#7b879c"}}><span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:d.color,marginRight:4}}/>{d.name} ({c})</button>})}
        </div>}
      </div>
      <div style={{position:"absolute",bottom:28,left:12,zIndex:1000,background:"#1c2029ee",border:"1px solid #2a3242",borderRadius:8,padding:"10px 14px",fontSize:10,color:"#7b879c",maxWidth:220}}>
        {mode==="delivery"?<><div style={{fontWeight:700,color:"#f0f2f7",marginBottom:6}}>Delivery Routes</div>{drivers.map(d=>{const c=(deliveryRoutes[d.id]||[]).length;if(!c)return null;return<div key={d.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,cursor:"pointer"}} onClick={()=>{setSelDriver(d.id);setRoutePanel({type:"delivery",driverId:d.id,driverName:d.name,driverColor:d.color,stops:deliveryRoutes[d.id]})}}><div style={{width:18,height:3,background:d.color,borderRadius:2}}/><span>{d.name} — {c} stops</span></div>})}</>:<><div style={{fontWeight:700,color:"#f0f2f7",marginBottom:6}}>Pickup Runs</div>{pickupRuns.map((run,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,cursor:"pointer"}} onClick={()=>setRoutePanel({type:"pickup",runIndex:i,color:["#22c55e","#06b6d4","#a855f7"][i%3],windowStart:run.windowStart,windowEnd:run.windowEnd,stops:run.stops,totalDrive:run.totalDrive,totalPickupTime:run.totalPickupTime,totalTime:run.totalTime})}><div style={{width:18,height:3,background:["#22c55e","#06b6d4","#a855f7"][i%3],borderRadius:2}}/><span>Run {i+1}: {fmtShort(run.windowStart)}–{fmtShort(run.windowEnd)}</span></div>)}</>}
      </div>
      {loading&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:1000,background:"#1c2029",borderRadius:8,padding:"16px 24px",color:"#7b879c",fontSize:12,fontWeight:600}}>Loading map...</div>}
      <div ref={mapRef} style={{width:"100%",height:"100%",background:"#12151c"}}/>
    </div>
    {routePanel&&<div style={{width:340,background:"#181c26",borderLeft:"1px solid #252d3a",overflowY:"auto",flexShrink:0}} className="fade-in">
      <div style={{padding:"14px 16px",borderBottom:"1px solid #252d3a",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#181c26",zIndex:2}}>
        <div><div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:15,color:routePanel.driverColor||routePanel.color}}>{routePanel.type==="delivery"?`${routePanel.driverName}'s Route`:`Pickup Run ${routePanel.runIndex+1}`}</div><div style={{fontSize:10,color:"#7b879c",marginTop:2}}>{routePanel.stops.length} stop{routePanel.stops.length>1?"s":""}{routePanel.type==="pickup"?` · ${fmtShort(routePanel.windowStart)}–${fmtShort(routePanel.windowEnd)}`:""}</div></div>
        <button onClick={()=>setRoutePanel(null)} style={{background:"#222a36",border:"1px solid #2e3848",borderRadius:5,padding:"3px 10px",color:"#7b879c",cursor:"pointer",fontFamily:"inherit",fontSize:11}}>✕</button>
      </div>
      <div style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #1e2530"}}><div style={{width:28,height:28,borderRadius:"50%",background:"#f59e0b",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,color:"#000",flexShrink:0}}>H</div><div><div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,color:"#f0f2f7"}}>Hannibal's HQ</div><div style={{fontSize:10,color:"#7b879c"}}>Depart</div></div></div>
      {routePanel.stops.map((stop,i)=>{const prev=i===0?HQ:routePanel.stops[i-1];const drv=gCD(driveCache,prev,stop);const isDel=routePanel.type==="delivery";const[bt,bc,bb]=cBadge(stop.complexity);return<div key={stop.id||i}><div style={{padding:"6px 16px 6px 30px",display:"flex",alignItems:"center",gap:8}}><div style={{width:1,height:16,background:"#2e3848"}}/><span style={{fontSize:10,color:"#566078",fontStyle:"italic"}}>🚐 ~{drv}min</span></div><div style={{padding:"12px 16px",borderBottom:"1px solid #1e2530",borderLeft:`3px solid ${routePanel.driverColor||routePanel.color}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:24,height:24,borderRadius:"50%",background:routePanel.driverColor||routePanel.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>{i+1}</div><div><div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,color:"#f0f2f7"}}>{stop.company}</div><div style={{fontSize:10,color:"#7b879c"}}>{stop.event}</div></div></div>{isDel&&<div style={{textAlign:"right"}}><div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:15,color:"#f0f2f7"}}>{fmtShort(tm(stop.deliveryTime))}</div><div style={{fontSize:9,color:"#7b879c"}}>serve {fmtShort(tm(stop.servingTime))}</div></div>}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 12px",fontSize:11,marginTop:6}}><div><span style={{color:"#566078"}}>Guests: </span><span style={{color:"#e0e5ee"}}>{stop.guests}</span></div>{isDel&&<div><span style={{color:"#566078"}}>Setup: </span><span style={{color:"#e0e5ee"}}>{stop.setupMinutes}min</span></div>}<div style={{gridColumn:"1/-1"}}><span style={{color:"#566078"}}>📍 </span><span style={{color:"#e0e5ee",fontSize:10}}>{stop.address}</span></div>{stop.contact&&<div style={{gridColumn:"1/-1"}}><span style={{color:"#566078"}}>👤 </span><span style={{color:"#e0e5ee"}}>{stop.contact} {stop.phone}</span></div>}</div>{stop.notes&&<div style={{marginTop:6,fontSize:10,color:"#f59e0b",background:"#26200f",borderRadius:4,padding:"4px 8px"}}>⚠ {stop.notes.substring(0,120)}</div>}{!isDel&&stop.pickup&&<div style={{marginTop:6,fontSize:10,color:"#86efac"}}>📦 {stop.pickup.note}</div>}</div></div>})}
      <div style={{padding:"6px 16px 6px 30px",display:"flex",alignItems:"center",gap:8}}><div style={{width:1,height:16,background:"#2e3848"}}/><span style={{fontSize:10,color:"#566078",fontStyle:"italic"}}>🚐 ~{routePanel.stops.length?gCD(driveCache,routePanel.stops[routePanel.stops.length-1],HQ):0}min return</span></div>
      <div style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,borderTop:"1px solid #1e2530"}}><div style={{width:28,height:28,borderRadius:"50%",background:"#f59e0b",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,color:"#000",flexShrink:0}}>H</div><div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,color:"#f0f2f7"}}>Return to HQ</div></div>
      <div style={{padding:"12px 16px",borderTop:"1px solid #252d3a",background:"#1a1f28"}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11}}><div><span style={{color:"#566078"}}>Stops:</span> <span style={{color:"#f0f2f7",fontWeight:600}}>{routePanel.stops.length}</span></div><div><span style={{color:"#566078"}}>Guests:</span> <span style={{color:"#f0f2f7",fontWeight:600}}>{routePanel.stops.reduce((s,o)=>s+o.guests,0)}</span></div></div></div>
    </div>}
  </div>);
}

/* ═══════════════════════════ UPLOAD / PREVIEW ═══════════════════════════ */
function UploadView({onOrdersConfirmed,initialDate}){
  const[dragging,setDragging]=useState(false),[parsing,setParsing]=useState(false),[error,setError]=useState(null),[log,setLog]=useState([]);
  const[previewOrders,setPreviewOrders]=useState(null),[expandedId,setExpandedId]=useState(null);
  const[dispatchDate,setDispatchDate]=useState(initialDate||dateStr(new Date()));
  const fileRef=useRef(null);
  const handleFile=async(file)=>{if(!file||!file.name.toLowerCase().endsWith(".pdf")){setError("Upload a CaterTrax Kitchen Sheet PDF");return}setError(null);setParsing(true);setLog(["Loading PDF.js..."]);try{setLog(p=>[...p,`Reading ${file.name}...`]);const text=await extractPdf(file);setLog(p=>[...p,`Extracted ${text.length.toLocaleString()} chars`]);const orders=parseCaterTrax(text);setLog(p=>[...p,`Found ${orders.length} orders`]);if(!orders.length){setError("No orders found.");setParsing(false);return}setPreviewOrders(orders)}catch(e){setError(`Parse error: ${e.message}`)}setParsing(false)};
  const updateOrder=(id,field,value)=>setPreviewOrders(p=>p.map(o=>o.id===id?{...o,[field]:value}:o));
  const setPickupType=(id,type)=>setPreviewOrders(p=>p.map(o=>{if(o.id!==id)return o;if(type==="none")return{...o,pickup:null};const w={"same-day":"10:00-16:00","next-day":"10:00-16:00","server-cleanup":"17:00-20:00"};const n={"same-day":"Same Day Pickup 10AM-4PM","next-day":"Next Day Pickup 10AM-4PM","server-cleanup":"Server handles cleanup"};return{...o,pickup:{type,window:w[type],note:n[type]}}}));
  const setComplexity=(id,c)=>setPreviewOrders(p=>p.map(o=>o.id===id?{...o,complexity:c,setupMinutes:guessSetup(c,o.guests)}:o));

  if(!previewOrders){return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#12151c",padding:40}}>
      <div style={{textAlign:"center",maxWidth:600,width:"100%"}}>
        <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:28,color:"#f0f2f7",marginBottom:4}}>HANNIBAL'S <span style={{color:"#f59e0b"}}>DISPATCH</span></div>
        <div style={{fontSize:13,color:"#7b879c",marginBottom:32}}>Upload your CaterTrax Kitchen Sheet to generate the dispatch</div>
        <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0])}} onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${dragging?"#f59e0b":"#2a3242"}`,borderRadius:12,padding:"48px 32px",cursor:"pointer",background:dragging?"#23201a":"#1a1f28",transition:"all .2s",marginBottom:20}}>
          <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
          <div style={{fontSize:40,marginBottom:12}}>{parsing?"⏳":"📄"}</div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:16,color:"#e0e5ee",marginBottom:8}}>{parsing?"Parsing orders...":"Drop PDF here or click to upload"}</div>
          <div style={{fontSize:11,color:"#7b879c"}}>CaterTrax Kitchen Sheet Report (.pdf)</div>
        </div>
        {error&&<div style={{background:"#201414",border:"1px solid #4a1010",borderRadius:6,padding:12,fontSize:12,color:"#fca5a5",marginBottom:16,textAlign:"left"}}>✗ {error}</div>}
        {log.length>0&&<div style={{background:"#1a1f28",border:"1px solid #252d3a",borderRadius:8,padding:14,textAlign:"left",maxHeight:180,overflowY:"auto"}}>{log.map((l,i)=><div key={i} style={{fontSize:11,color:"#7b879c",fontFamily:"'IBM Plex Mono',monospace",lineHeight:1.8}}>{l}</div>)}</div>}
      </div>
    </div>
  )}

  // Preview & Edit
  return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:"#12151c"}}>
      <div style={{background:"#181c26",borderBottom:"1px solid #252d3a",padding:"12px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:18,color:"#f0f2f7"}}>Review & Edit <span style={{color:"#f59e0b"}}>({previewOrders.length} orders)</span></div>
          <div style={{fontSize:11,color:"#7b879c",marginTop:2}}>Edit details, set pickup types, then dispatch</div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:"#7b879c"}}>Date:</span>
            <input type="date" value={dispatchDate} onChange={e=>setDispatchDate(e.target.value)} style={{background:"#222a36",border:"1px solid #2e3848",borderRadius:5,padding:"5px 10px",color:"#f0f2f7",fontFamily:"inherit",fontSize:12}}/>
          </div>
          <button onClick={()=>{setPreviewOrders(null);setLog([])}} style={{background:"#222a36",border:"1px solid #2e3848",borderRadius:6,padding:"8px 18px",color:"#7b879c",fontFamily:"inherit",fontSize:12,fontWeight:600,cursor:"pointer"}}>← Re-upload</button>
          <button onClick={()=>onOrdersConfirmed(previewOrders,dispatchDate)} style={{background:"#f59e0b",border:"none",borderRadius:6,padding:"8px 24px",color:"#000",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:800,cursor:"pointer",boxShadow:"0 2px 8px rgba(245,158,11,.3)"}}>Dispatch {previewOrders.length} Orders →</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 24px"}}>
        {[...previewOrders].sort((a,b)=>tm(a.deliveryTime)-tm(b.deliveryTime)).map((o,idx)=>{
          const[bt,bc,bb]=cBadge(o.complexity);const expanded=expandedId===o.id;
          return(<div key={o.id} className="preview-card fade-in" style={{animationDelay:`${idx*30}ms`,borderLeft:`4px solid ${o.complexity==="vip"?"#fbbf24":o.complexity==="bar-event"?"#c4b5fd":"#3b82f6"}`}}>
            <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setExpandedId(expanded?null:o.id)}>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:16,color:"#f0f2f7",width:52}}>{fmtShort(tm(o.deliveryTime))}</div>
              <div style={{flex:1}}><div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,color:"#e0e5ee"}}>{o.company}</div><div style={{fontSize:10,color:"#7b879c"}}>{o.event} · {o.address.split(",")[0]}</div></div>
              <div style={{display:"flex",gap:4,alignItems:"center"}}><div className="badge" style={{background:bb,color:bc}}>{o.guests}p</div><div className="badge" style={{background:bb,color:bc}}>{bt}</div></div>
              {/* Pickup toggle buttons — always visible */}
              <div style={{display:"flex",gap:2}}>
                {[{t:"none",l:"No Pickup",c:"#566078",bg:"#222a36"},{t:"same-day",l:"Same-Day",c:"#86efac",bg:"#162014"},{t:"next-day",l:"Next-Day",c:"#f59e0b",bg:"#26200f"},{t:"server-cleanup",l:"Server",c:"#93c5fd",bg:"#141c2a"}].map(({t,l,c,bg})=>{
                  const active=(t==="none"&&!o.pickup)||(o.pickup?.type===t);
                  return<button key={t} onClick={e=>{e.stopPropagation();setPickupType(o.id,t)}} style={{padding:"3px 8px",borderRadius:4,border:active?`2px solid ${c}`:"1px solid #2e3848",background:active?bg:"transparent",color:active?c:"#566078",fontSize:9,fontWeight:active?700:500,fontFamily:"inherit",cursor:"pointer",transition:"all .12s"}}>{l}</button>
                })}
              </div>
              <div style={{fontSize:16,color:"#566078",transition:"transform .15s",transform:expanded?"rotate(180deg)":"rotate(0)"}}>▾</div>
              <button onClick={e=>{e.stopPropagation();setPreviewOrders(p=>p.filter(x=>x.id!==o.id))}} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:14,padding:4,opacity:0.5}} title="Remove">✕</button>
            </div>
            {expanded&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #252d3a"}} className="fade-in">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px 16px"}}>
                <div><div className="dlbl">Company</div><input className="preview-input" value={o.company} onChange={e=>updateOrder(o.id,"company",e.target.value)}/></div>
                <div><div className="dlbl">Event</div><input className="preview-input" value={o.event} onChange={e=>updateOrder(o.id,"event",e.target.value)}/></div>
                <div><div className="dlbl">Guests</div><input className="preview-input" type="number" value={o.guests} onChange={e=>updateOrder(o.id,"guests",parseInt(e.target.value)||0)}/></div>
                <div><div className="dlbl">Delivery Time</div><input className="preview-input" type="time" value={o.deliveryTime} onChange={e=>updateOrder(o.id,"deliveryTime",e.target.value)}/></div>
                <div><div className="dlbl">Serving Time</div><input className="preview-input" type="time" value={o.servingTime} onChange={e=>updateOrder(o.id,"servingTime",e.target.value)}/></div>
                <div><div className="dlbl">Setup (min)</div><input className="preview-input" type="number" value={o.setupMinutes} onChange={e=>updateOrder(o.id,"setupMinutes",parseInt(e.target.value)||10)}/></div>
                <div><div className="dlbl">Complexity</div><select className="preview-select" value={o.complexity} onChange={e=>setComplexity(o.id,e.target.value)} style={{width:"100%"}}>{COMPLEXITY_OPTS.map(c=><option key={c} value={c}>{c.toUpperCase()}</option>)}</select></div>
                <div><div className="dlbl">Room/Floor</div><input className="preview-input" value={o.room} onChange={e=>updateOrder(o.id,"room",e.target.value)}/></div>
                <div><div className="dlbl">Contact</div><input className="preview-input" value={o.contact} onChange={e=>updateOrder(o.id,"contact",e.target.value)}/></div>
                <div style={{gridColumn:"1/-1"}}><div className="dlbl">Address</div><input className="preview-input" value={o.address} onChange={e=>updateOrder(o.id,"address",e.target.value)}/></div>
                <div style={{gridColumn:"1/-1"}}><div className="dlbl">Menu</div><textarea className="preview-input" rows={2} value={o.menu} onChange={e=>updateOrder(o.id,"menu",e.target.value)} style={{resize:"vertical"}}/></div>
                <div style={{gridColumn:"1/-1"}}><div className="dlbl">Notes</div><textarea className="preview-input" rows={2} value={o.notes} onChange={e=>updateOrder(o.id,"notes",e.target.value)} style={{resize:"vertical"}}/></div>
              </div>
              {o.pickup&&<div style={{marginTop:10,background:"#162014",border:"1px solid #244028",borderRadius:6,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:11,color:"#86efac"}}>📦 {o.pickup.note}</div><div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:10,color:"#7b879c"}}>Window:</span><input className="preview-input" style={{width:110,background:"#1a3020",borderColor:"#2a4030"}} value={o.pickup.window} onChange={e=>setPreviewOrders(p=>p.map(x=>x.id===o.id?{...x,pickup:{...x.pickup,window:e.target.value}}:x))} placeholder="HH:MM-HH:MM"/></div></div>}
            </div>}
          </div>)})}
      </div>
    </div>
  );
}

/* ═══════════════════════════ HISTORY VIEW ═══════════════════════════ */
function HistoryView({onLoadDate,currentDate}){
  const[history,setHistory]=useState(null),[loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{setLoading(true);const h=await loadHistory();setHistory(h||[]);setLoading(false)})()},[]);
  if(loading)return<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#7b879c"}}>Loading history...</div>;
  return(<div style={{flex:1,overflow:"auto",padding:20}}>
    <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:18,color:"#f0f2f7",marginBottom:4}}>Dispatch History</div>
    <div style={{fontSize:12,color:"#7b879c",marginBottom:20}}>Click any date to load that dispatch. Current: <b style={{color:"#f59e0b"}}>{friendlyDate(currentDate)}</b></div>
    {(!history||!history.length)?<div style={{color:"#566078",fontSize:12}}>No saved dispatches yet. Upload a PDF and dispatch to save.</div>:
    <div style={{display:"grid",gap:8}}>
      {history.map(h=>{const ords=h.orders||[];const guests=ords.reduce((s,o)=>s+o.guests,0);const isCurrent=h.dispatch_date===currentDate;const isToday=h.dispatch_date===dateStr(new Date());const isPast=h.dispatch_date<dateStr(new Date());const isFuture=h.dispatch_date>dateStr(new Date());
        return<div key={h.id} onClick={()=>onLoadDate(h.dispatch_date)} style={{background:isCurrent?"#1c2436":"#1a1f28",border:`1px solid ${isCurrent?"#3b82f6":"#252d3a"}`,borderRadius:8,padding:"14px 18px",cursor:"pointer",transition:"all .15s",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:18,color:isToday?"#f59e0b":isFuture?"#86efac":"#e0e5ee",minWidth:90}}>{friendlyDate(h.dispatch_date)}</div>
            <div>
              <div style={{fontSize:12,color:"#e0e5ee"}}>{ords.length} orders · {guests} guests</div>
              <div style={{fontSize:10,color:"#566078",marginTop:2}}>{ords.slice(0,3).map(o=>o.company).join(", ")}{ords.length>3?` +${ords.length-3} more`:""}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {isToday&&<span style={{fontSize:9,fontWeight:700,color:"#f59e0b",background:"#26200f",padding:"2px 8px",borderRadius:3}}>TODAY</span>}
            {isFuture&&<span style={{fontSize:9,fontWeight:700,color:"#86efac",background:"#162014",padding:"2px 8px",borderRadius:3}}>UPCOMING</span>}
            {isPast&&!isToday&&<span style={{fontSize:9,fontWeight:700,color:"#566078",background:"#1e2530",padding:"2px 8px",borderRadius:3}}>PAST</span>}
            <button onClick={async(e)=>{e.stopPropagation();if(confirm("Delete this dispatch day?")){{await deleteDispatchDay(h.id);setHistory(p=>p.filter(x=>x.id!==h.id))}}}} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:14,opacity:0.4,padding:4}}>🗑</button>
          </div>
        </div>})}
    </div>}
  </div>);
}

/* ═══════════════════════════ MAIN APP ═══════════════════════════ */
export default function App(){
  const[orders,setOrders]=useState([]);
  const[drivers,setDrivers]=useState(DEF_DRIVERS);
  const[asgn,setAsgn]=useState({});
  const[sched,setSched]=useState({});
  const[dc]=useState({});
  const[selOrder,setSelOrder]=useState(null);
  const[view,setView]=useState("map");
  const[editDrv,setEditDrv]=useState(null);
  const[drag,setDrag]=useState(null);
  const[dropT,setDropT]=useState(null);
  const[pkRuns,setPkRuns]=useState([]);
  const[phase,setPhase]=useState("upload");
  const[currentDate,setCurrentDate]=useState(dateStr(new Date()));
  const[supaOk,setSupaOk]=useState(!!getSupaConfig());
  const[saveStatus,setSaveStatus]=useState("");
  const saveTimer=useRef(null);

  const rebuild=useCallback((a,o,d)=>{const ords=o||orders;const drv=d||drivers;setSched(buildSched(ords,a,drv,dc));setPkRuns(groupPickups(ords.filter(x=>x.pickup&&x.pickup.type==="same-day"),dc))},[orders,drivers,dc]);

  // Auto-save to Supabase
  const doSave=useCallback(async(ords,asgnData,drvs,date)=>{
    if(!getSupaConfig())return;
    setSaveStatus("saving");
    const result=await saveDispatchDay(date||currentDate,ords||orders,asgnData||asgn,drvs||drivers);
    setSaveStatus(result?"saved":"error");
    if(result)setTimeout(()=>setSaveStatus(""),2000);
  },[currentDate,orders,asgn,drivers]);

  const scheduleSave=useCallback((ords,asgnData,drvs)=>{
    if(saveTimer.current)clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(()=>doSave(ords,asgnData,drvs),1500);
  },[doSave]);

  const onConfirmed=useCallback((confirmed,date)=>{
    const resolved=confirmed.map(o=>{const coords=guessCo(o.address);return{...o,lat:coords.lat,lng:coords.lng}});
    setOrders(resolved);setCurrentDate(date);
    const a=autoAssign(resolved,drivers,dc);
    setAsgn(a);setSched(buildSched(resolved,a,drivers,dc));
    setPkRuns(groupPickups(resolved.filter(x=>x.pickup&&x.pickup.type==="same-day"),dc));
    setPhase("dispatch");
    // Save immediately
    if(getSupaConfig()){saveDispatchDay(date,resolved,a,drivers).then(r=>setSaveStatus(r?"saved":"error"));setTimeout(()=>setSaveStatus(""),2000)}
  },[drivers,dc]);

  const loadDate=useCallback(async(date)=>{
    setCurrentDate(date);
    const data=await loadDispatchDay(date);
    if(data&&data.orders?.length){
      setOrders(data.orders);
      if(data.drivers?.length)setDrivers(data.drivers);
      const a=data.assignments&&Object.keys(data.assignments).length?data.assignments:autoAssign(data.orders,data.drivers||drivers,dc);
      setAsgn(a);setSched(buildSched(data.orders,a,data.drivers||drivers,dc));
      setPkRuns(groupPickups(data.orders.filter(x=>x.pickup&&x.pickup.type==="same-day"),dc));
      setPhase("dispatch");setView("map");
    }else{
      setPhase("upload");
    }
  },[drivers,dc]);

  // Load today on startup if Supabase configured
  useEffect(()=>{if(getSupaConfig()){loadDate(dateStr(new Date()))}},[]);

  const dStart=(e,oid,fid)=>{setDrag({orderId:oid,fromDriverId:fid});e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",oid);if(e.target?.style)e.target.style.opacity="0.4"};
  const dOver=(e,did)=>{e.preventDefault();e.dataTransfer.dropEffect="move";if(dropT!==did)setDropT(did)};
  const dLeave=(e)=>{if(e.currentTarget&&!e.currentTarget.contains(e.relatedTarget))setDropT(null)};
  const dDrop=(e,did)=>{e.preventDefault();setDropT(null);if(!drag)return;const u={...asgn,[drag.orderId]:did};setAsgn(u);rebuild(u);setDrag(null);scheduleSave(orders,u,drivers)};
  const dEnd=(e)=>{if(e.target?.style)e.target.style.opacity="1";setDrag(null);setDropT(null)};
  const reassign=(oid,did)=>{const u={...asgn,[oid]:did};setAsgn(u);rebuild(u);scheduleSave(orders,u,drivers)};

  const stats=useMemo(()=>{const g=orders.reduce((s,o)=>s+o.guests,0);const e=orders.length?orders.reduce((m,o)=>Math.min(m,tm(o.deliveryTime)),Infinity):0;const l=orders.length?orders.reduce((m,o)=>Math.max(m,tm(o.deliveryTime)),0):0;const dl={};drivers.forEach(d=>{dl[d.id]=0});Object.entries(asgn).forEach(([oid,did])=>{const o=orders.find(x=>x.id===oid);if(o&&dl[did]!=null)dl[did]+=o.guests});return{n:orders.length,g,e:e?fmt(e):"--",l:l?fmt(l):"--",dl}},[orders,asgn,drivers]);
  const dcol=(d)=>drivers.find(x=>x.id===d)?.color||"#555";
  const dnam=(d)=>drivers.find(x=>x.id===d)?.name||"—";
  const nowM=useMemo(()=>{const n=new Date();return n.getHours()*60+n.getMinutes()},[]);
  const allPk=useMemo(()=>orders.filter(o=>o.pickup).map(o=>({...o,ws:o.pickup.window.split("-")[0],we:o.pickup.window.split("-")[1],driver:asgn[o.id]})).sort((a,b)=>tm(a.ws)-tm(b.ws)),[orders,asgn]);

  if(phase==="upload")return<UploadView onOrdersConfirmed={onConfirmed} initialDate={currentDate}/>;

  return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column"}}>
      {/* HEADER */}
      <div className="hdr">
        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div className="brand">HANNIBAL'S <em>DISPATCH</em></div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <div className="pill"><b>{stats.n}</b><span>Orders</span></div>
            <div className="pill"><b>{stats.g}</b><span>Guests</span></div>
            <div className="pill"><b>{stats.e}</b><span>First</span></div>
            <div className="pill"><b>{stats.l}</b><span>Last</span></div>
          </div>
          {saveStatus&&<div style={{fontSize:10,padding:"3px 8px",borderRadius:4,fontWeight:600,background:saveStatus==="saved"?"#162014":saveStatus==="saving"?"#1c2029":"#201414",color:saveStatus==="saved"?"#86efac":saveStatus==="saving"?"#7b879c":"#fca5a5"}}>{saveStatus==="saved"?"✓ Saved":saveStatus==="saving"?"Saving...":"Save error"}</div>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          {/* Date switcher */}
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <button onClick={()=>{const d=new Date(currentDate+"T12:00:00");d.setDate(d.getDate()-1);loadDate(dateStr(d))}} style={{background:"#222a36",border:"1px solid #2e3848",borderRadius:4,padding:"4px 8px",color:"#7b879c",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>◀</button>
            <input type="date" value={currentDate} onChange={e=>loadDate(e.target.value)} style={{background:"#222a36",border:"1px solid #2e3848",borderRadius:5,padding:"4px 10px",color:"#f0f2f7",fontFamily:"inherit",fontSize:12}}/>
            <button onClick={()=>{const d=new Date(currentDate+"T12:00:00");d.setDate(d.getDate()+1);loadDate(dateStr(d))}} style={{background:"#222a36",border:"1px solid #2e3848",borderRadius:4,padding:"4px 8px",color:"#7b879c",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>▶</button>
          </div>
          <button onClick={()=>setPhase("upload")} style={{background:"#262d3a",border:"1px solid #3a4560",borderRadius:5,padding:"5px 14px",color:"#f59e0b",fontFamily:"inherit",fontSize:11,fontWeight:600,cursor:"pointer"}}>📄 Upload</button>
          <div className="tabs">
            {[["map","🗺 Map"],["timeline","⏱ Timeline"],["orders","📋 Orders"],["pickups","📦 Pickups"],["history","📅 History"],["settings","⚙ Settings"]].map(([v,l])=>
              <button key={v} className={`tab ${view===v?"on":""}`} onClick={()=>setView(v)}>{l}</button>)}
          </div>
        </div>
      </div>

      <div className="grid">
        {/* SIDEBAR */}
        <div className="side">
          <div className="sec">
            <div className="stitle">Drivers</div>
            {drivers.map(d=>{const cnt=Object.values(asgn).filter(a=>a===d.id).length;const g=stats.dl[d.id]||0;const isE=editDrv===d.id,isD=dropT===d.id;
              return<div key={d.id} className={`dcard ${isE?"editing":""} ${isD?"drop-target":""}`} onClick={()=>setEditDrv(isE?null:d.id)} onDragOver={e=>dOver(e,d.id)} onDragLeave={dLeave} onDrop={e=>dDrop(e,d.id)}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}><div className="ddot" style={{background:d.color}}/>{isE?<input className="dinput" value={d.name} onChange={e=>{e.stopPropagation();setDrivers(p=>p.map(x=>x.id===d.id?{...x,name:e.target.value}:x))}} onClick={e=>e.stopPropagation()} autoFocus/>:<span style={{fontWeight:600,color:"#e0e5ee",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>{d.name}</span>}</div>
                {isE?<div style={{display:"flex",flexDirection:"column",gap:4,fontSize:10,color:"#7b879c"}}><div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{width:36}}>Start:</span><input className="dinput" type="time" value={d.available} onChange={e=>{e.stopPropagation();setDrivers(p=>p.map(x=>x.id===d.id?{...x,available:e.target.value}:x))}} onClick={e=>e.stopPropagation()} style={{width:100}}/></div><div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{width:36}}>End:</span><input className="dinput" type="time" value={d.end} onChange={e=>{e.stopPropagation();setDrivers(p=>p.map(x=>x.id===d.id?{...x,end:e.target.value}:x))}} onClick={e=>e.stopPropagation()} style={{width:100}}/></div></div>:<div style={{fontSize:10,color:"#7b879c"}}>{fmtShort(tm(d.available))} – {fmtShort(tm(d.end))}</div>}
                <div style={{fontSize:10,color:"#7b879c",marginTop:3}}>{cnt} deliver{cnt!==1?"ies":"y"} · {g} guests</div>
              </div>})}
          </div>
          <div className="sec">
            <div className="stitle">Orders ({orders.length})</div>
            {[...orders].sort((a,b)=>tm(a.deliveryTime)-tm(b.deliveryTime)).map(o=>{const did=asgn[o.id];const[bt,bc,bb]=cBadge(o.complexity);
              return<div key={o.id} className={`ocard ${selOrder===o.id?"sel":""}`} style={{opacity:drag?.orderId===o.id?.35:1}} onClick={()=>setSelOrder(selOrder===o.id?null:o.id)} draggable onDragStart={e=>dStart(e,o.id,did)} onDragEnd={dEnd}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}><div className="otime">{fmtShort(tm(o.deliveryTime))}</div><div style={{display:"flex",gap:3}}><div className="badge" style={{background:bb,color:bc}}>{o.guests}p</div><div className="badge" style={{background:bb,color:bc}}>{bt}</div></div></div>
                <div className="ocomp">{o.company}</div><div className="odet">{o.event}</div><div className="odet" style={{marginTop:2}}>{o.address.split(",")[0]}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}><select className="dsel" value={did||""} onChange={e=>{e.stopPropagation();reassign(o.id,e.target.value)}} onClick={e=>e.stopPropagation()} style={{borderLeft:`3px solid ${dcol(did)}`}}>{drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><span style={{fontSize:9,color:"#566078"}}>#{o.id}</span></div>
              </div>})}
          </div>
        </div>

        {/* MAIN */}
        <div style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {view==="map"&&<MapView orders={orders} assignments={asgn} drivers={drivers} pickupRuns={pkRuns} driveCache={dc}/>}

          {view==="timeline"&&<><div className="tl-wrap"><div style={{minWidth:1100}}>
            <div className="tl-hdr">{HR.map(h=><div key={h} className="tl-h">{h}</div>)}</div>
            {drivers.map(d=>{const blocks=sched[d.id]||[];const tot=TL_END-TL_START;return<div key={d.id} className={`tl-row ${dropT===d.id?"drop-over":""}`} onDragOver={e=>dOver(e,d.id)} onDragLeave={dLeave} onDrop={e=>dDrop(e,d.id)}>
              <div className="tl-lbl"><div className="ddot" style={{background:d.color}}/><span style={{fontSize:11,fontWeight:600,color:"#e0e5ee",fontFamily:"'DM Sans',sans-serif"}}>{d.name}</span></div>
              <div className="tl-track">{HR.map((_,i)=><div key={i} style={{position:"absolute",left:`${(i/HR.length)*100}%`,top:0,bottom:0,width:1,background:"#1e2530"}}/>)}
                {nowM>=TL_START&&nowM<=TL_END&&d===drivers[0]&&<div className="now" style={{left:`${((nowM-TL_START)/tot)*100}%`,bottom:`-${(drivers.length-1)*52+20}px`}}/>}
                {blocks.map((b,i)=>{const l=((b.start-TL_START)/tot)*100,w=(b.duration/tot)*100;if(l>100||l+w<0)return null;return<div key={i} className={`tl-blk ${b.type}`} style={{left:`${Math.max(0,l)}%`,width:`${Math.max(.3,w)}%`,background:d.color}} title={`${b.label}\n${fmt(b.start)} – ${fmt(b.start+b.duration)}`} onClick={()=>b.orderId&&setSelOrder(b.orderId)} draggable={!!b.orderId} onDragStart={e=>b.orderId&&dStart(e,b.orderId,d.id)} onDragEnd={dEnd}>{w>2&&<span style={{fontSize:8,overflow:"hidden",textOverflow:"ellipsis"}}>{b.label}</span>}</div>})}
              </div></div>})}
          </div></div>
          {selOrder&&(()=>{const o=orders.find(x=>x.id===selOrder);if(!o)return null;const drv=gCD(dc,HQ,o),mi=hvMi(HQ,o).toFixed(1);
            return<div className="detail fade-in" key={selOrder}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><div><div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:17,color:"#f0f2f7"}}>{o.company}</div><div style={{fontSize:12,color:"#7b879c"}}>{o.event} · #{o.id}</div></div><button onClick={()=>setSelOrder(null)} style={{background:"#222a36",border:"1px solid #2e3848",borderRadius:5,padding:"3px 10px",color:"#7b879c",cursor:"pointer",fontFamily:"inherit",fontSize:11}}>✕</button></div>
              <div className="dgrid"><div><div className="dlbl">Delivery</div><div className="dval">{fmt(tm(o.deliveryTime))}</div></div><div><div className="dlbl">Serving</div><div className="dval">{fmt(tm(o.servingTime))}</div></div><div><div className="dlbl">Guests</div><div className="dval">{o.guests}</div></div><div><div className="dlbl">Setup</div><div className="dval">{o.setupMinutes}min</div></div><div><div className="dlbl">Drive</div><div className="dval">~{drv}min · {mi}mi</div></div><div><div className="dlbl">Contact</div><div className="dval">{o.contact} · {o.phone}</div></div><div style={{gridColumn:"1/-1"}}><div className="dlbl">Address</div><div className="dval">{o.address}</div></div><div style={{gridColumn:"1/-1"}}><div className="dlbl">Menu</div><div className="dval" style={{fontSize:11,lineHeight:1.7}}>{o.menu}</div></div></div>
              {o.notes&&<div className="nbox">⚠ {o.notes}</div>}{o.pickup&&<div style={{marginTop:8,background:"#162014",border:"1px solid #244028",borderRadius:5,padding:8,fontSize:11,color:"#86efac"}}>📦 {o.pickup.note}</div>}
            </div>})()}</>}

          {view==="orders"&&<div style={{flex:1,overflow:"auto",padding:20}}><div style={{display:"grid",gap:10}}>
            {[...orders].sort((a,b)=>tm(a.deliveryTime)-tm(b.deliveryTime)).map((o,idx)=>{const[bt,bc,bb]=cBadge(o.complexity);
              return<div key={o.id} className="fade-in" style={{animationDelay:`${idx*25}ms`,background:"#1a1f28",border:"1px solid #252d3a",borderRadius:9,padding:16,borderLeft:`4px solid ${dcol(asgn[o.id])}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div><div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:16,color:"#f0f2f7"}}>{o.company}</div><div style={{fontSize:11,color:"#7b879c",marginTop:2}}>{o.event}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:800,color:"#f0f2f7",fontFamily:"'DM Sans',sans-serif"}}>{fmtShort(tm(o.deliveryTime))}</div></div></div>
                <div className="dgrid" style={{marginBottom:10}}><div><div className="dlbl">Guests</div><div className="dval">{o.guests}</div></div><div><div className="dlbl">Setup</div><div className="dval">{o.setupMinutes}min</div></div><div><div className="dlbl">Driver</div><div className="dval" style={{color:dcol(asgn[o.id])}}>{dnam(asgn[o.id])}</div></div><div style={{gridColumn:"1/-1"}}><div className="dlbl">Address</div><div className="dval">{o.address} · {o.room}</div></div></div>
                <div><div className="dlbl">Menu</div><div className="dval" style={{fontSize:11,lineHeight:1.6}}>{o.menu}</div></div>
                {o.notes&&<div className="nbox">⚠ {o.notes}</div>}{o.pickup&&<div style={{marginTop:8,background:"#162014",border:"1px solid #244028",borderRadius:5,padding:8,fontSize:11,color:"#86efac"}}>📦 {o.pickup.note}</div>}
              </div>})}
          </div></div>}

          {view==="pickups"&&<div style={{flex:1,overflow:"auto",padding:20}}>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:18,color:"#f0f2f7",marginBottom:16}}>Pickup Route Optimizer</div>
            {pkRuns.map((run,ri)=><div key={ri} className="pk-run fade-in"><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:15,color:"#86efac"}}>Run {ri+1}: {fmtShort(run.windowStart)} – {fmtShort(run.windowEnd)}</div><div style={{fontSize:14,color:"#86efac",fontWeight:700}}>{run.totalTime}min</div></div>
              {run.stops.map((st,si)=>{const drv=gCD(dc,si===0?HQ:run.stops[si-1],st);return<div key={st.id}><div style={{padding:"4px 0 4px 10px",fontSize:9,color:"#7b879c",fontStyle:"italic"}}>🚐 {drv}min →</div><div className="pk-stop"><div className="pk-num">{si+1}</div><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#e0e5ee",fontFamily:"'DM Sans',sans-serif"}}>{st.company}</div><div style={{fontSize:10,color:"#7b879c"}}>{st.address}</div><div style={{fontSize:10,color:"#86efac",marginTop:4}}>{st.pickup.note}</div></div><div style={{fontSize:10,color:"#7b879c"}}>{st.guests}p</div></div></div>})}
              <div className="pk-total"><span>🚐 {run.totalDrive}min drive</span><span>📦 {run.totalPickupTime}min load</span><span>⏱ {run.totalTime}min total</span></div>
            </div>)}
            {allPk.filter(p=>p.pickup.type==="server-cleanup").length>0&&<div style={{marginTop:24}}><div className="stitle">Server Cleanup</div>{allPk.filter(p=>p.pickup.type==="server-cleanup").map(p=><div key={p.id} className="pkcard"><div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,color:"#e0e5ee"}}>{p.company}</div><div style={{fontSize:11,color:"#93c5fd",marginTop:6}}>{p.pickup.note}</div></div>)}</div>}
            {allPk.filter(p=>p.pickup.type==="next-day").length>0&&<div style={{marginTop:24}}><div className="stitle">Next-Day Pickups</div>{allPk.filter(p=>p.pickup.type==="next-day").map(p=><div key={p.id} className="pkcard"><div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,color:"#e0e5ee"}}>{p.company}</div><div style={{fontSize:11,color:"#f59e0b",marginTop:6}}>⏰ {p.pickup.note}</div></div>)}</div>}
          </div>}

          {view==="history"&&<HistoryView onLoadDate={loadDate} currentDate={currentDate}/>}

          {view==="settings"&&<div style={{flex:1,overflow:"auto",padding:20,maxWidth:680}}>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:18,color:"#f0f2f7",marginBottom:16}}>Settings</div>

            {/* Supabase */}
            <div className="api-bar">
              <div style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,color:"#e0e5ee",marginBottom:8}}>Supabase Connection</div>
              <div style={{fontSize:11,color:"#7b879c",marginBottom:10}}>Connect to Supabase to save dispatches across sessions. Create a table first:</div>
              <div style={{background:"#12151c",borderRadius:6,padding:12,fontSize:11,fontFamily:"'IBM Plex Mono',monospace",color:"#7b879c",lineHeight:1.8,marginBottom:12,whiteSpace:"pre-wrap",overflowX:"auto"}}>{`CREATE TABLE dispatch_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dispatch_date DATE NOT NULL UNIQUE,
  orders JSONB NOT NULL DEFAULT '[]',
  assignments JSONB NOT NULL DEFAULT '{}',
  drivers JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dispatch_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON dispatch_days FOR ALL USING (true);`}</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div><div className="dlbl">Supabase URL</div><input className="api-input" placeholder="https://xxxx.supabase.co" defaultValue={getSupaConfig()?.url||""} id="supa-url" style={{marginTop:2}}/></div>
                <div><div className="dlbl">Anon Key</div><input className="api-input" type="password" placeholder="eyJhbGciOi..." defaultValue={getSupaConfig()?.key||""} id="supa-key" style={{marginTop:2}}/></div>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <button className="api-btn" onClick={async()=>{
                    const url=document.getElementById("supa-url").value.trim().replace(/\/$/,"");
                    const key=document.getElementById("supa-key").value.trim();
                    if(!url||!key){alert("Enter both URL and key");return}
                    setSupaConfig(url,key);
                    // Test connection
                    const test=await supaFetch("/dispatch_days?limit=1");
                    if(test!==null){setSupaOk(true);alert("Connected! Dispatches will now auto-save.")}
                    else{setSupaOk(false);alert("Connection failed. Check URL, key, and that the table exists.")}
                  }}>Save & Test Connection</button>
                  {supaOk&&<span style={{fontSize:10,color:"#86efac"}}>✓ Connected</span>}
                </div>
              </div>
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}
