// usgs.js — USGS earthquake feed (public GeoJSON, CORS-enabled).
// Globals: USGS_FEED, loadQuakes(), magColor(), shortPlace()
// https://earthquake.usgs.gov/earthquakes/feed/v1.0/

const USGS_FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";

async function loadQuakes() {
  const r = await fetch(USGS_FEED);
  if (!r.ok) throw new Error("usgs " + r.status);
  const j = await r.json();
  return (j.features || [])
    .map(f => ({
      id: f.id,
      mag: f.properties.mag,
      place: f.properties.place || "unknown",
      time: f.properties.time,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      depth: f.geometry.coordinates[2],
      felt: f.properties.felt,
      tsunami: f.properties.tsunami,
      url: f.properties.url,
    }))
    .filter(q => q.mag != null && Number.isFinite(q.lat))
    .sort((a, b) => b.time - a.time);
}

// magnitude -> colour (calm grey, through gore reds, to violet for the monsters)
function magColor(m) {
  if (m < 2) return "#8a9298";
  if (m < 3) return "#e6d756";
  if (m < 4) return "#e69a2f";
  if (m < 5) return "#e6201c";
  if (m < 6) return "#bd0a13";
  return "#9c3bd1";
}

// "65 km WNW of Catuday, Philippines" -> trimmed for the narrow panel
function shortPlace(p) {
  return (p || "").replace(/^\d+\s*km\s+\w+\s+of\s+/i, "").slice(0, 24);
}
