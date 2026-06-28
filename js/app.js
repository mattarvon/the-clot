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

// image cascade: per-id -> per-species -> default -> inline SVG shark.
// Drop files in assets/sharks/ (e.g. white.png, tiger.png, mako.png, default.png,
// or 1.png for a specific shark). Top-down view, nose pointing up, transparent bg.
function sharkImgErr(img, hot) {
  let list = [];
  try { list = JSON.parse(img.getAttribute('data-fallback') || '[]'); } catch (e) {}
  if (list.length) {
    img.src = list.shift();
    img.setAttribute('data-fallback', JSON.stringify(list));
    return;
  }
  const wrap = document.createElement('div');
  wrap.className = 'svgfallback';
  wrap.innerHTML = `<svg viewBox="-70 -42 140 84" width="100%" height="100%">${sharkSVG(1, !!hot)}</svg>`;
  img.replaceWith(wrap);
}

function markerHTML(s, hot, head) {
  const key = speciesKey(s.species);
  const srcs = [`assets/sharks/${s.id}.png`, `assets/sharks/${key}.png`, `assets/sharks/default.png`];
  return `
    <div class="sbody">
      <div class="chum"></div>
      <img class="sphoto" style="--rot:${head.toFixed(0)}deg" src="${srcs[0]}"
           data-fallback='${JSON.stringify(srcs.slice(1))}'
           onerror="sharkImgErr(this,${hot ? 1 : 0})" alt="">
      ${hot ? '<span class="drip"></span>' : ''}
      <span class="pulse" style="--pc:${hot ? '#e6201c' : '#2fb6b6'}"></span>
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

    let head = 0;
    if (s.pings.length > 1) {
      const a = s.pings[s.pings.length - 2], b = lp;
      head = bearing([+a.latitude, +a.longitude], [+b.latitude, +b.longitude]);
    }
    const icon = L.divIcon({
      className: 'smark' + (sel ? ' sel' : '') + (hot ? ' hot' : ''),
      html: markerHTML(s, hot, head), iconSize: [70, 70], iconAnchor: [35, 35],
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
  render();
}

// show the satellite map immediately; populate markers once the feed resolves
initMap();
load().then(boot);
