// blocks.js — extra telemetry blocks for The Clot: GDACS planetary hazards,
// NOAA SWPC space weather, Open-Meteo weather, GBIF shark sightings.
// Self-contained: fetch + panel render + map layers + refresh. Uses globals map, L.
// (uses gid() to avoid clashing with dashboard.js's $)

const gid = id => document.getElementById(id);
let hazLayer, sightLayer;

// ===================== GDACS planetary hazards =====================
const GDACS_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?fromdate=&todate=&alertlevel=&eventlist=";
const HAZ_TYPE = { EQ: "Quake", TC: "Cyclone", FL: "Flood", VO: "Volcano", DR: "Drought", WF: "Wildfire", TS: "Tsunami" };
function alertColor(a) {
  a = (a || "").toLowerCase();
  return a === "red" ? "#e6201c" : a === "orange" ? "#e69a2f" : a === "green" ? "#56e6b4" : "#8a9298";
}
async function loadHazards() {
  const r = await fetch(GDACS_URL);
  if (!r.ok) throw new Error("gdacs " + r.status);
  const j = await r.json();
  return (j.features || []).map(f => {
    const p = f.properties || {}, g = f.geometry || {};
    const co = g.coordinates || [];
    return {
      type: p.eventtype, alert: p.alertlevel, name: p.name || p.eventname,
      country: p.country, from: p.fromdate, modified: p.datemodified, lat: co[1], lon: co[0],
      sev: p.severitydata && p.severitydata.severitytext,
      url: (p.url && (p.url.report || p.url.details)) || null,
    };
  }).filter(e => Number.isFinite(e.lat));
}
const HAZ_RANK = { Red: 3, Orange: 2, Green: 1 };
function renderHaz(events) {
  const el = gid("haz-rows"); if (!el) return;
  const sorted = events.slice().sort((a, b) => (HAZ_RANK[b.alert] || 0) - (HAZ_RANK[a.alert] || 0) || new Date(b.from) - new Date(a.from));
  el.innerHTML = sorted.length ? sorted.slice(0, 6).map(e => `
    <div class="trow">
      <span class="tn">${HAZ_TYPE[e.type] || e.type} · ${(e.country || e.name || "").slice(0, 18)}</span>
      <span class="tv" style="color:${alertColor(e.alert)}">${(e.alert || "?").slice(0, 1).toUpperCase()}</span>
    </div>`).join("") : `<div class="tmuted">no active hazards</div>`;
}
function plotHaz(events) {
  if (!hazLayer) return;
  hazLayer.clearLayers();
  events.forEach(e => {
    const c = alertColor(e.alert), r = e.alert === "Red" ? 7 : e.alert === "Orange" ? 5 : 4;
    L.circleMarker([e.lat, e.lon], { radius: r, color: c, weight: 1.4, fillColor: c, fillOpacity: .22 })
      .bindTooltip(`<b>${HAZ_TYPE[e.type] || e.type}</b> · ${e.alert}<br>${e.name || e.country || ""}`,
        { className: "telem-tip", direction: "top" })
      .on("click", () => inspect({
        kind: (HAZ_TYPE[e.type] || e.type) + " · GDACS", title: e.name || e.country || "Hazard",
        rows: [
          { k: "Alert level", v: e.alert, color: c },
          { k: "Type", v: HAZ_TYPE[e.type] || e.type },
          { k: "Country", v: e.country, full: true },
          { k: "Severity", v: e.sev, full: true },
          { k: "From", v: (e.from || "").slice(0, 10) },
          { k: "Updated", v: (e.modified || "").slice(0, 10) },
        ], lat: e.lat, lon: e.lon, link: e.url, linkLabel: "GDACS report ↗",
      })).addTo(hazLayer);
  });
}

// ===================== space weather (NOAA SWPC) =====================
async function loadSpaceWx() {
  const [kpR, swR] = await Promise.all([
    fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"),
    fetch("https://services.swpc.noaa.gov/products/solar-wind/mag-1-day.json"),
  ]);
  const kpA = await kpR.json(), sw = await swR.json();
  const kl = kpA[kpA.length - 1];
  const kp = Array.isArray(kl) ? +kl[1] : +kl.Kp;
  const last = sw[sw.length - 1];
  return { kp, bz: +last[3], bt: +last[6] };
}
function gScale(kp) {
  if (kp < 5) return "G0 quiet";
  return "G" + Math.min(5, Math.floor(kp) - 4) + " storm";
}
function renderSW(d) {
  const el = gid("sw-rows"); if (!el) return;
  const kpc = d.kp >= 5 ? "#e6201c" : d.kp >= 4 ? "#e69a2f" : "#56e6b4";
  el.innerHTML =
    `<div class="airagg" style="color:${kpc}">Kp ${d.kp.toFixed(1)}<small>${gScale(d.kp)} · geomagnetic</small></div>
     <div class="trow"><span class="tn">Solar-wind Bz</span><span class="tv" style="color:${d.bz < 0 ? "#e6201c" : "#56e6b4"}">${d.bz.toFixed(1)}<small>nT</small></span></div>
     <div class="trow"><span class="tn">Field Bt</span><span class="tv">${d.bt.toFixed(1)}<small>nT</small></span></div>`;
}

// ===================== weather (Open-Meteo) =====================
const WX_CITIES = [
  { name: "Boston", lat: 42.36, lon: -71.06 }, { name: "New York", lat: 40.71, lon: -74.0 },
  { name: "Miami", lat: 25.77, lon: -80.19 }, { name: "New Orleans", lat: 29.95, lon: -90.07 },
  { name: "San Francisco", lat: 37.77, lon: -122.42 }, { name: "Seattle", lat: 47.6, lon: -122.33 },
];
const WMO = { 0: "Clear", 1: "Fair", 2: "Cloudy", 3: "Overcast", 45: "Fog", 48: "Rime", 51: "Drizzle", 53: "Drizzle", 55: "Drizzle", 61: "Rain", 63: "Rain", 65: "Downpour", 71: "Snow", 73: "Snow", 75: "Snow", 80: "Showers", 81: "Showers", 82: "Violent", 95: "Storm", 96: "Hailstorm", 99: "Hailstorm" };
async function loadWeather() {
  return Promise.all(WX_CITIES.map(async c => {
    try {
      const j = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`)).json();
      const cu = j.current || {};
      return { name: c.name, temp: cu.temperature_2m, wind: cu.wind_speed_10m, code: cu.weather_code };
    } catch (e) { return null; }
  }));
}
function renderWx(rows) {
  const el = gid("wx-rows"); if (!el) return;
  const live = rows.filter(Boolean);
  el.innerHTML = live.length ? live.map(c => `
    <div class="trow">
      <span class="tn">${c.name} · ${WMO[c.code] || "—"}</span>
      <span class="tv">${Math.round(c.temp)}<small>°F</small></span>
    </div>`).join("") : `<div class="tmuted">no data</div>`;
}

// ===================== GBIF shark sightings =====================
const SHARK_TAXA = [885, 887]; // Lamniformes + Carcharhiniformes
async function loadSightings() {
  const tk = SHARK_TAXA.map(k => "taxon_key=" + k).join("&");
  const j = await (await fetch(`https://api.gbif.org/v1/occurrence/search?${tk}&hasCoordinate=true&year=2020,2026&limit=60`)).json();
  return (j.results || []).map(x => ({
    sp: x.species || x.scientificName, sci: x.scientificName, lat: x.decimalLatitude, lon: x.decimalLongitude,
    date: (x.eventDate || "").slice(0, 10), c: x.countryCode, basis: x.basisOfRecord, key: x.key,
    locality: x.locality, dataset: x.datasetName,
  })).filter(s => Number.isFinite(s.lat));
}
function abbr(sp) { return (sp || "shark").replace(/^(\w)\w+\s+/, "$1. "); }
function renderSight(rows) {
  const el = gid("sight-rows"); if (!el) return;
  el.innerHTML = rows.length ? rows.slice(0, 6).map(s => `
    <div class="trow">
      <span class="tn">${abbr(s.sp)}<small class="qago"> ${s.date || ""}</small></span>
      <span class="tv" style="color:#9aa0a3">${s.c || ""}</span>
    </div>`).join("") : `<div class="tmuted">no records</div>`;
}
function plotSight(rows) {
  if (!sightLayer) return;
  sightLayer.clearLayers();
  rows.forEach(s => {
    L.circleMarker([s.lat, s.lon], { radius: 2.6, stroke: false, fillColor: "#bd0a13", fillOpacity: .55 })
      .bindTooltip(`${s.sp || "shark"} · ${s.date || ""}`, { className: "telem-tip", direction: "top" })
      .on("click", () => inspect({
        kind: "Shark sighting · GBIF", title: s.sp || "Shark",
        rows: [
          { k: "Species", v: s.sci || s.sp, full: true },
          { k: "Date", v: s.date },
          { k: "Country", v: s.c },
          { k: "Locality", v: s.locality, full: true },
          { k: "Record type", v: s.basis },
          { k: "Dataset", v: s.dataset, full: true },
        ], lat: s.lat, lon: s.lon,
        link: s.key ? `https://www.gbif.org/occurrence/${s.key}` : null, linkLabel: "GBIF record ↗",
      })).addTo(sightLayer);
  });
}

// ===================== boot =====================
function initBlocks() {
  if (typeof map !== "undefined" && map) {
    hazLayer = L.layerGroup().addTo(map);
    sightLayer = L.layerGroup().addTo(map);
  }
  const rHaz = async () => { try { const e = await loadHazards(); renderHaz(e); plotHaz(e); } catch (x) {} };
  const rSW = async () => { try { renderSW(await loadSpaceWx()); } catch (x) { const el = gid("sw-rows"); if (el) el.innerHTML = `<div class="tmuted">feed error</div>`; } };
  const rWx = async () => { try { renderWx(await loadWeather()); } catch (x) {} };
  const rSight = async () => { try { const r = await loadSightings(); renderSight(r); plotSight(r); } catch (x) {} };
  rHaz();   setInterval(rHaz, 5 * 60 * 1000);
  rSW();    setInterval(rSW, 5 * 60 * 1000);
  rWx();    setInterval(rWx, 10 * 60 * 1000);
  rSight(); setInterval(rSight, 30 * 60 * 1000);
}
initBlocks();
