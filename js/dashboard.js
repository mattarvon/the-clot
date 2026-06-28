// dashboard.js — telemetry panel (NOAA tides + PurpleAir PM2.5) and map layers.
// Depends on: noaa.js, purpleair.js, and the Leaflet `map` global from app.js.

let tideLayer, airLayer;
const $ = id => document.getElementById(id);

function arrow(t) { return t > 0.03 ? "▲" : t < -0.03 ? "▼" : "•"; }
function trendCls(t) { return t > 0.03 ? "up" : t < -0.03 ? "dn" : "flat"; }

// ---------- tides ----------
function renderTides(rows) {
  const live = rows.filter(Boolean);
  $("tide-rows").innerHTML = live.length ? live.map(s => `
    <div class="trow">
      <span class="tn">${s.name}</span>
      <span class="tv ${trendCls(s.trend)}">${s.value.toFixed(2)}<small>ft</small> <i>${arrow(s.trend)}</i></span>
    </div>`).join("") : `<div class="tmuted">no readings</div>`;
}
function plotTides(rows) {
  if (!tideLayer) return;
  tideLayer.clearLayers();
  rows.filter(Boolean).forEach(s => {
    if (s.lat == null || s.lon == null) return;
    const c = s.trend > 0.03 ? "#56e6b4" : s.trend < -0.03 ? "#e6201c" : "#8a9298";
    L.circleMarker([s.lat, s.lon], { radius: 5, color: c, weight: 1.5, fillColor: c, fillOpacity: .35 })
      .bindTooltip(`<b>${s.name}</b><br>${s.value.toFixed(2)} ft ${arrow(s.trend)} ${s.trend > 0 ? "flooding" : "ebbing"}`,
        { className: "telem-tip", direction: "top" })
      .on("click", () => inspect({
        kind: "Tide gauge · NOAA CO-OPS", title: s.name,
        rows: [
          { k: "Water level", v: s.value.toFixed(2) + " ft", color: c },
          { k: "State", v: s.trend > 0.03 ? "Flooding ▲" : s.trend < -0.03 ? "Ebbing ▼" : "Slack water", color: c },
          { k: "Change / hr", v: (s.trend >= 0 ? "+" : "") + s.trend.toFixed(2) + " ft" },
          { k: "Station ID", v: s.id },
          { k: "Reading time", v: s.t, full: true },
        ], lat: s.lat, lon: s.lon,
        link: `https://tidesandcurrents.noaa.gov/stationhome.html?id=${s.id}`, linkLabel: "NOAA station ↗",
      }))
      .addTo(tideLayer);
  });
}
async function refreshTides() {
  try { const rows = await loadTides(); renderTides(rows); plotTides(rows); } catch (e) {}
}

// ---------- air (PurpleAir) ----------
function keyForm() {
  return `<div class="pakey">
      <input id="pa-input" type="password" placeholder="PurpleAir read key" autocomplete="off">
      <button id="pa-save">SET</button>
    </div>
    <div class="tmuted">Enter a free read key to stream live PM2.5.</div>`;
}
function wireKey() {
  const b = $("pa-save"); if (!b) return;
  b.onclick = () => { const v = $("pa-input").value; if (v.trim()) { setPaKey(v); refreshAir(); } };
  $("pa-input").onkeydown = e => { if (e.key === "Enter") b.click(); };
}
function renderAir(rows) {
  const el = $("air-rows");
  if (rows === null) { el.innerHTML = keyForm(); wireKey(); return; }
  if (!rows.length) { el.innerHTML = `<div class="tmuted">no sensors reporting in view</div>`; return; }
  const avg = rows.reduce((a, s) => a + s.pm, 0) / rows.length;
  const worst = rows.slice().sort((a, b) => b.pm - a.pm).slice(0, 6);
  el.innerHTML =
    `<div class="airagg" style="color:${pmColor(avg)}">${avg.toFixed(1)}<small>µg/m³ · ${rows.length} sensors · ${pmCategory(avg)}</small></div>` +
    worst.map(s => `<div class="trow"><span class="tn">${(s.name || "sensor").slice(0, 22)}</span>` +
      `<span class="tv" style="color:${pmColor(s.pm)}">${s.pm.toFixed(1)}</span></div>`).join("");
}
function plotAir(rows) {
  if (!airLayer) return;
  airLayer.clearLayers();
  if (!rows) return;
  rows.forEach(s => {
    L.circleMarker([s.lat, s.lon], { radius: 3, stroke: false, fillColor: pmColor(s.pm), fillOpacity: .8 })
      .bindTooltip(`${s.name || "sensor"}: ${s.pm.toFixed(1)} µg/m³`, { className: "telem-tip", direction: "top" })
      .on("click", () => inspect({
        kind: "Air sensor · PurpleAir", title: s.name || "Sensor",
        rows: [
          { k: "PM2.5", v: s.pm.toFixed(1) + " µg/m³", color: pmColor(s.pm) },
          { k: "AQI band", v: pmCategory(s.pm), color: pmColor(s.pm) },
        ], lat: s.lat, lon: s.lon,
      }))
      .addTo(airLayer);
  });
}
async function refreshAir() {
  const bbox = { nwlat: 49, nwlng: -125, selat: 24, selng: -66 }; // CONUS
  try {
    const rows = await loadAir(bbox);
    renderAir(rows); plotAir(rows);
  } catch (e) {
    $("air-rows").innerHTML = `<div class="tmuted">feed error — check key. ${keyForm()}</div>`;
    wireKey();
  }
}

// ---------- boot ----------
function initDashboard() {
  if (typeof map !== "undefined" && map) {
    tideLayer = L.layerGroup().addTo(map);
    airLayer = L.layerGroup().addTo(map);
  }
  const t = $("telem-toggle");
  if (t) t.onclick = () => $("telem").classList.toggle("collapsed");

  refreshTides(); setInterval(refreshTides, 5 * 60 * 1000);
  refreshAir();   setInterval(refreshAir, 5 * 60 * 1000);
}
initDashboard();
