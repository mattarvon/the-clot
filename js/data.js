// data.js — load order: OCEARCH live feed first, themed demo pod on failure.
// Globals: SHARKS, LIVE, OCEARCH, load(), parseTz(), lastPing(), daysAgo()
//
// The live endpoint is undocumented and serves plain http, so in most browser
// contexts it will be blocked by mixed-content / CORS and we fall back to the
// demo pod. Put a CORS-adding proxy in front of OCEARCH and point this there to
// light up real data — the render code is schema-identical.

const OCEARCH = "https://www.ocearch.org/tracker/ajax/filter-sharks?tracking-activity=ping-most-recent";

let SHARKS = [];
let LIVE = false;

// ---- schema helpers (work on both live and mock objects) ----
function parseTz(s) {
  // "27 Sep 2017 07:57:20 -0400"
  const m = /^(\d+)\s+(\w+)\s+(\d+)\s+(\d+):(\d+):(\d+)/.exec(s || "");
  if (!m) return 0;
  const mo = MONTHS.indexOf(m[2]);
  if (mo < 0) return 0;
  return Date.UTC(+m[3], mo, +m[1], +m[4], +m[5], +m[6]);
}
function lastPing(s) { return s.pings && s.pings.length ? s.pings[s.pings.length - 1] : null; }
function daysAgo(t) { return Math.floor((Date.now() - t) / 864e5); }

// ---- seeded demo pod ----
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const _pad = n => String(n).padStart(2,'0');
function fmtTz(d){
  const off=d.getTimezoneOffset();
  const tz=(off>0?'-':'+')+_pad(Math.abs(off)/60|0)+_pad(Math.abs(off)%60);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${_pad(d.getHours())}:${_pad(d.getMinutes())}:${_pad(d.getSeconds())} ${tz}`;
}
function track(seed, lon, lat, n, sx, sy){
  const r=mulberry(seed); const out=[]; let L=lon,T=lat; const now=Date.now();
  for(let i=0;i<n;i++){
    L+=(r()-.5)*sx; T+=(r()-.5)*sy;
    const when=new Date(now-(n-1-i)*(1.4+r()*2.6)*864e5);
    out.push({latitude:T.toFixed(5),longitude:L.toFixed(5),tz_datetime:fmtTz(when)});
  }
  return out;
}
const WS="White Shark (Carcharodon carcharias)",
      TG="Tiger Shark (Galeocerdo cuvier)",
      MK="Shortfin Mako (Isurus oxyrinchus)";

const MOCK=[
  {id:1,name:"Mary Lee",species:WS,gender:"female",stageOfLife:"Mature",length:"16ft (4.9 m)",weight:"3456 lbs.",tagDate:"17 Sep 2012",tagLocation:"Cape Cod, MA",pings:track(11,-71,41,16,5,3)},
  {id:2,name:"Katharine",species:WS,gender:"female",stageOfLife:"Sub-adult",length:"14ft 2in (4.3 m)",weight:"2300 lbs.",tagLocation:"Cape Cod, MA",tagDate:"02 Aug 2013",pings:track(23,-79,31,15,6,3.4)},
  {id:3,name:"Lydia",species:WS,gender:"female",stageOfLife:"Mature",length:"14ft 6in (4.4 m)",weight:"2000 lbs.",tagLocation:"Jacksonville, FL",tagDate:"02 Mar 2013",pings:track(37,-66,38,18,7,3)},
  {id:4,name:"Contender",species:WS,gender:"male",stageOfLife:"Mature",length:"13ft 9in (4.2 m)",weight:"1653 lbs.",tagLocation:"FL-GA line",tagDate:"17 Jan 2025",pings:track(51,-77,33,14,5.5,3.2)},
  {id:5,name:"Breton",species:WS,gender:"male",stageOfLife:"Mature",length:"13ft 3in (4.0 m)",weight:"1437 lbs.",tagLocation:"Scatarie Island, NS",tagDate:"12 Sep 2020",pings:track(67,-69,44,15,6,3.6)},
  {id:6,name:"Nukumi",species:WS,gender:"female",stageOfLife:"Mature",length:"17ft 2in (5.2 m)",weight:"3541 lbs.",tagLocation:"Lunenburg, NS",tagDate:"02 Oct 2020",pings:track(83,-60,43,13,7,3)},
  {id:7,name:"Maple",species:TG,gender:"female",stageOfLife:"Sub-adult",length:"10ft 7in (3.2 m)",weight:"616 lbs.",tagLocation:"Bermuda",tagDate:"21 Jun 2023",pings:track(97,-64,30,12,5,3.5)},
  {id:8,name:"Khaleesi",species:WS,gender:"female",stageOfLife:"Sub-adult",length:"9ft 4in (2.8 m)",weight:"460 lbs.",tagLocation:"Gansbaai, ZA",tagDate:"15 May 2022",pings:track(110,20,-35,12,5,3)},
  {id:9,name:"Bronson",species:WS,gender:"male",stageOfLife:"Mature",length:"12ft 9in (3.9 m)",weight:"1326 lbs.",tagLocation:"Neptune Is, AU",tagDate:"08 Dec 2021",pings:track(126,135,-35,11,6,3)},
  {id:10,name:"Riptide",species:MK,gender:"male",stageOfLife:"Mature",length:"8ft 1in (2.5 m)",weight:"298 lbs.",tagLocation:"Montauk, NY",tagDate:"30 Jul 2024",pings:track(140,-71,39,16,8,3)},
];

async function load(){
  try{
    const c=new AbortController();
    const t=setTimeout(()=>c.abort(),4500);
    const r=await fetch(OCEARCH,{signal:c.signal});
    clearTimeout(t);
    if(!r.ok) throw 0;
    const j=await r.json();
    if(Array.isArray(j)&&j.length&&j[0].pings){ SHARKS=j; LIVE=true; }
    else throw 0;
  }catch(e){
    SHARKS=MOCK; LIVE=false;
  }
}
