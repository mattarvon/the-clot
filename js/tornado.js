// tornado.js — tornadoes on the map: live NWS Tornado Warnings (storm-based
// polygons) + SPC tornado reports (today, fallback yesterday). Animated funnel
// icons. Self-contained; uses globals map, L.

let tornadoLayer;

function tornCentroid(ring) { // ring = [[lon,lat],...] -> [lat,lon]
  let x = 0, y = 0; ring.forEach(c => { x += c[0]; y += c[1]; });
  return [y / ring.length, x / ring.length];
}

async function loadTornadoWarnings() {
  const r = await fetch("https://api.weather.gov/alerts/active?event=Tornado%20Warning");
  if (!r.ok) throw new Error("nws " + r.status);
  const j = await r.json();
  return (j.features || []).filter(f => f.geometry && f.geometry.type === "Polygon").map(f => {
    const ring = f.geometry.coordinates[0];
    return { area: f.properties.areaDesc || "", ll: tornCentroid(ring), ring: ring.map(c => [c[1], c[0]]) };
  });
}

function parseSPC(text) {
  const lines = (text || "").trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  return lines.slice(1).map(l => {
    const p = l.split(",");
    if (p.length < 7) return null;
    const lat = +p[5], lon = +p[6];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { time: p[0], f: p[1], loc: p[2], state: p[4], lat, lon };
  }).filter(Boolean);
}
async function loadTornadoReports() {
  let t = await (await fetch("https://www.spc.noaa.gov/climo/reports/today_torn.csv")).text();
  let rep = parseSPC(t), day = "today";
  if (!rep.length) {
    t = await (await fetch("https://www.spc.noaa.gov/climo/reports/yesterday_torn.csv")).text();
    rep = parseSPC(t); day = "recent";
  }
  return { rep, day };
}

function funnelSVG(active) {
  const top = active ? "#cfd3d5" : "#9aa0a3", bot = active ? "#3a0509" : "#363c42";
  return `<svg viewBox="-12 -2 24 42" width="100%" height="100%">
    <defs><linearGradient id="tg${active ? "a" : "r"}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs>
    <g class="funnel">
      <path d="M-10 0 Q-7 16 -2.5 30 Q-1 35 0 37 Q1 35 2.5 30 Q7 16 10 0 Q0 5 -10 0 Z"
            fill="url(#tg${active ? "a" : "r"})" stroke="#161b20" stroke-width=".5" opacity=".93"/>
      <path d="M-8 4 Q0 8 8 4" stroke="#eef1f2" stroke-width=".8" fill="none" opacity=".5"/>
      <path d="M-6 11 Q0 14 6 11" stroke="#eef1f2" stroke-width=".7" fill="none" opacity=".42"/>
      <path d="M-4 19 Q0 21 4 19" stroke="#eef1f2" stroke-width=".6" fill="none" opacity=".36"/>
      <ellipse cx="0" cy="38" rx="6" ry="2.2" fill="#6b7278" opacity=".55"/>
      ${active ? '<ellipse cx="0" cy="38" rx="7.5" ry="2.8" fill="none" stroke="#e6201c" stroke-width=".8" opacity=".75"/>' : ""}
    </g>
  </svg>`;
}

function plotTorn(warnings, reports) {
  if (!tornadoLayer) return;
  tornadoLayer.clearLayers();
  warnings.forEach(w => {
    L.polygon(w.ring, { color: "#e6201c", weight: 1.5, fill: false, dashArray: "4 3" }).addTo(tornadoLayer);
    L.marker(w.ll, { icon: L.divIcon({ className: "tornado active", html: funnelSVG(true), iconSize: [28, 46], iconAnchor: [14, 44] }) })
      .bindTooltip(`<b>Tornado Warning</b><br>${w.area}`, { className: "telem-tip", direction: "top" }).addTo(tornadoLayer);
  });
  reports.forEach(r => {
    L.marker([r.lat, r.lon], { icon: L.divIcon({ className: "tornado", html: funnelSVG(false), iconSize: [22, 38], iconAnchor: [11, 36] }) })
      .bindTooltip(`Tornado ${r.f === "UNK" ? "EF?" : "EF" + r.f} · ${r.loc}, ${r.state}`, { className: "telem-tip", direction: "top" }).addTo(tornadoLayer);
  });
}

function renderTorn(warnings, reports, day) {
  const el = document.getElementById("torn-rows"); if (!el) return;
  let html = "";
  if (warnings.length) {
    html += `<div class="airagg" style="color:#e6201c;font-size:18px">${warnings.length} active warning${warnings.length > 1 ? "s" : ""}<small>NWS storm-based</small></div>`;
    html += warnings.slice(0, 4).map(w => `<div class="trow"><span class="tn" style="color:#e6201c">${(w.area || "").split(";")[0]}</span><span class="tv" style="color:#e6201c">●</span></div>`).join("");
  }
  if (reports.length) {
    html += reports.slice(0, 5).map(r => `<div class="trow"><span class="tn">${r.loc}, ${r.state}<small class="qago"> ${day}</small></span><span class="tv" style="color:#e69a2f">${r.f === "UNK" ? "EF?" : "EF" + r.f}</span></div>`).join("");
  }
  el.innerHTML = html || `<div class="tmuted">no active warnings or recent reports</div>`;
}

function initTornado() {
  if (typeof map !== "undefined" && map) tornadoLayer = L.layerGroup().addTo(map);
  const refresh = async () => {
    const [w, rd] = await Promise.all([
      loadTornadoWarnings().catch(() => []),
      loadTornadoReports().catch(() => ({ rep: [], day: "" })),
    ]);
    renderTorn(w, rd.rep, rd.day); plotTorn(w, rd.rep);
  };
  refresh();
  setInterval(refresh, 60 * 1000);
}
initTornado();
