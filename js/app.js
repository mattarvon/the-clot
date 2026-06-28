// app.js — Leaflet satellite map, photoreal shark markers + gore, dossier, controls.
// Depends on globals from shark.js (sharkSVG) and data.js (load, SHARKS, LIVE, lastPing, parseTz, daysAgo).

let showTrails = true, recentOnly = false, selId = null;
let map, tiles, trailsLayer, markersLayer;

// Esri World Imagery — real satellite basemap (attribution required).
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTR = "Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community";

// ---------- map ----------
function initMap() {
  map = L.map('map', {
    zoomControl: false, attributionControl: true,
    worldCopyJump: true, minZoom: 2, maxZoom: 17,
    zoomSnap: 0.5, wheelPxPerZoomLevel: 120,
  }).setView([34, -58], 3);
  tiles = L.tileLayer(ESRI, { attribution: ESRI_ATTR, maxZoom: 17 }).addTo(map);
  trailsLayer = L.layerGroup().addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

// ---------- helpers ----------
// compass bearing (deg, 0 = north, clockwise) between two [lat,lon] points
function bearing(a, b) {
  const toR = d => d * Math.PI / 180, toD = r => r * 180 / Math.PI;
  const p1 = toR(a[0]), p2 = toR(b[0]), dl = toR(b[1] - a[1]);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (toD(Math.atan2(y, x)) + 360) % 360;
}
function speciesKey(sp) {
  const s = (sp || "").toLowerCase();
  if (s.includes("tiger")) return "tiger";
  if (s.includes("mako")) return "mako";
  if (s.includes("white")) return "white";
  return "default";
}

// image cascade for the DOSSIER PORTRAIT only (map markers are the vector shark).
// per-id -> per-species -> default, across formats. Drop files in assets/sharks/
// (e.g. 1.jpg, white.webp, default.jpg). See assets/sharks/README.md.
const IMG_EXTS = ['png', 'webp', 'jpg', 'jpeg', 'gif', 'svg'];

function imgSrcs(s) {
  const key = speciesKey(s.species);
  const srcs = [];
  [String(s.id), key, 'default'].forEach(b => IMG_EXTS.forEach(e => srcs.push(`assets/sharks/${b}.${e}`)));
  return srcs;
}
// dossier case-file portrait: walk the image cascade; hide the banner if none load.
function setPortrait(s) {
  const img = document.getElementById('d-photo');
  const srcs = imgSrcs(s);
  let i = 0;
  img.classList.remove('on');
  img.onload = () => img.classList.add('on');
  img.onerror = () => { i++; if (i < srcs.length) img.src = srcs[i]; else { img.onerror = null; img.removeAttribute('src'); } };
  img.src = srcs[0];
}

// Marker uses a TRANSPARENT PNG cutout (assets/sharks/<id|species|default>.png) as
// a real shark-in-the-water when present, else the vector shark. Either way it
// floats in the gore field. PNGs are probed once at boot (see probeMarkers).
const PNG_RESOLVED = {};   // shark id -> working png url, or '' = use vector
function pngSrcs(s) {
  const key = speciesKey(s.species);
  return [String(s.id), key, 'default'].map(b => `assets/sharks/${b}.png`);
}
function probeImg(url) {
  return new Promise(res => { const im = new Image(); im.onload = () => res(true); im.onerror = () => res(false); im.src = url; });
}
// Probe SEQUENTIALLY and cache per-URL: the zero-dep dev server is single-threaded
// and drops connections under a parallel burst, which would mis-flag images as missing.
const _urlExists = {};
async function probeUrl(u) {
  if (u in _urlExists) return _urlExists[u];
  const ok = await probeImg(u);
  _urlExists[u] = ok;
  return ok;
}
async function probeMarkers() {
  for (const s of SHARKS) {
    PNG_RESOLVED[s.id] = '';
    for (const u of pngSrcs(s)) { if (await probeUrl(u)) { PNG_RESOLVED[s.id] = u; break; } }
  }
}

// map marker: a full campy shark adrift in a field of blood + body parts.
function markerHTML(s, hot) {
  const flip = bearingWest(s) ? -1 : 1;
  const ping = hot ? '#e6201c' : '#2fb6b6';
  const url = PNG_RESOLVED[s.id];
  const photo = typeof url === 'string' && url;
  const sharkVec = photo ? '' :
    `<g transform="translate(6,0)"><g transform="scale(${flip},1)"><g class="sharkwrap">${sharkSVG(0.82, hot)}</g></g></g>`;
  const sharkImg = photo ?
    `<div class="scutwrap" style="--flip:${flip}"><img class="scut" src="${url}" alt=""></div>` : '';
  return `
    <div class="sbody">
      <svg class="smarksvg" viewBox="-72 -58 144 116" width="100%" height="100%" overflow="visible">
        ${goreField(s.id)}
        <circle class="pulse" cx="0" cy="0" r="3.4" fill="none" stroke="${ping}" stroke-width="1.2"/>
        <circle cx="0" cy="0" r="1.8" fill="${ping}"/>
        ${sharkVec}
      </svg>
      ${sharkImg}
    </div>
    <div class="nm">${(s.name || 'Unknown').toUpperCase()}</div>`;
}

function addTrail(s) {
  const latlngs = s.pings.map(p => [+p.latitude, +p.longitude]);
  L.polyline(latlngs, { color:'#7a0b10', weight:2, opacity:.5, dashArray:'1 6', lineCap:'round' }).addTo(trailsLayer);
  s.pings.forEach(p => L.circleMarker([+p.latitude, +p.longitude],
    { radius:1.7, stroke:false, fillColor:'#9c1118', fillOpacity:.6 }).addTo(trailsLayer));
}

// ---------- per-render of trails + markers ----------
function render() {
  if (!map) return;
  trailsLayer.clearLayers(); markersLayer.clearLayers();
  const sp = document.getElementById('sp').value;
  let shown = 0;

  SHARKS.forEach(s => {
    if (sp !== "*" && s.species !== sp) return;
    const lp = lastPing(s); if (!lp) return;
    const t = parseTz(lp.tz_datetime);
    if (recentOnly && daysAgo(t) > 30) return;
    shown++;

    const hot = daysAgo(t) <= 14;
    const sel = selId === s.id;
    if (showTrails && s.pings.length > 1) addTrail(s);

    const icon = L.divIcon({
      className: 'smark' + (sel ? ' sel' : '') + (hot ? ' hot' : ''),
      html: markerHTML(s, hot), iconSize: [132, 106], iconAnchor: [66, 53],
    });
    const m = L.marker([+lp.latitude, +lp.longitude], { icon, riseOnHover: true }).addTo(markersLayer);
    m.on('click', () => select(s.id));
  });

  document.getElementById('num').textContent = shown;
}

// ---------- dossier ----------
const dossier = document.getElementById('dossier');
function select(id) {
  selId = id;
  if (typeof closeInspector === "function") closeInspector();   // dossier + inspector are mutually exclusive
  const s = SHARKS.find(x => x.id === id); if (!s) { render(); return; }
  const lp = lastPing(s); const t = parseTz(lp?.tz_datetime); const dd = daysAgo(t);
  document.getElementById('hint').style.display = 'none';
  document.getElementById('d-sp').textContent = (s.species || "").replace(/\s*\(.*\)/, '') || "Shark";
  document.getElementById('d-name').textContent = s.name || "Unknown";
  document.getElementById('d-len').textContent = s.length || "—";
  document.getElementById('d-wt').textContent = s.weight || "—";
  document.getElementById('d-sex').textContent = s.gender || "—";
  document.getElementById('d-stage').textContent = s.stageOfLife || "—";
  document.getElementById('d-tag').textContent = (s.tagDate || "—") + (s.tagLocation ? "  ·  " + s.tagLocation : "");
  document.getElementById('d-last').textContent = t ? (dd === 0 ? "Today" : dd + " day" + (dd>1?"s":"") + " ago") : "unknown";
  document.getElementById('d-pings').textContent = s.pings ? s.pings.length : 0;
  document.getElementById('d-pos').textContent = lp ? (Number(lp.latitude).toFixed(2) + ", " + Number(lp.longitude).toFixed(2)) : "—";
  document.getElementById('d-foot').textContent = dd <= 14 ? "Status: actively surfacing" : "Status: gone dark";
  setPortrait(s);
  dossier.classList.add('open');
  if (map && lp) map.flyTo([+lp.latitude, +lp.longitude], Math.max(map.getZoom(), 5), { duration: .8 });
  render();
}
document.getElementById('dx').addEventListener('click', () => {
  dossier.classList.remove('open'); selId = null;
  document.getElementById('hint').style.display = '';
  render();
});

// ---------- controls ----------
document.getElementById('swTrack').addEventListener('click', e => {
  e.currentTarget.classList.toggle('on');
  showTrails = e.currentTarget.classList.contains('on'); render();
});
document.getElementById('swRecent').addEventListener('click', e => {
  e.currentTarget.classList.toggle('on');
  recentOnly = e.currentTarget.classList.contains('on'); render();
});

// ---------- boot ----------
function boot() {
  const feed = document.getElementById('feed'), ft = document.getElementById('feedtxt');
  if (LIVE) { feed.classList.add('live'); ft.textContent = "Live feed · OCEARCH"; }
  else { feed.classList.add('demo'); ft.textContent = "Demo pod · no live feed"; }

  const sel = document.getElementById('sp');
  [...new Set(SHARKS.map(s => s.species))].sort().forEach(sp => {
    const o = document.createElement('option');
    o.value = sp; o.textContent = sp.replace(/\s*\(.*\)/, ''); sel.appendChild(o);
  });
  sel.addEventListener('change', render);
  render();                         // vector first, instant
  probeMarkers().then(render);      // swap in any PNG cutouts once probed
}

// show the satellite map immediately; populate markers once the feed resolves
initMap();
load().then(boot);
