// seismo.js — dripping-blood seismograph driven by USGS quakes.
// Canvas trace: ambient micro-tremor + a wave-packet spike per quake (height
// scales with magnitude), blood drips falling from the peaks. Plus a readout
// list and epicenter markers on the Leaflet `map` global.

let _quakes = [], _drips = [], _seismoRaf = 0, quakeLayer;
const SEISMO_WIN = 30 * 60 * 1000;   // 30-minute window across the canvas

function ambient(x, t) {
  return Math.sin(x * 0.30 + t * 0.0020) * 1.6
       + Math.sin(x * 0.11 - t * 0.0013) * 1.0
       + Math.sin(x * 0.07 + t * 0.0031) * 0.6;
}

function startSeismo() {
  const cv = document.getElementById("seismo");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function size() {
    const w = cv.clientWidth || 218, h = cv.clientHeight || 70;
    cv.width = w * dpr; cv.height = h * dpr;
  }
  size();
  window.addEventListener("resize", size);

  function draw() {
    const w = cv.width / dpr, h = cv.height / dpr, mid = h / 2, now = Date.now();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // grid
    ctx.strokeStyle = "rgba(40,70,80,.22)"; ctx.lineWidth = 1;
    for (let gx = 0; gx <= w; gx += w / 6) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();

    // trace = ambient tremor + a wave packet per in-window quake
    let peakX = -1, peakAmp = 0;
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      let amp = ambient(x, now);
      for (const q of _quakes) {
        if (q.time > now) continue;
        const qx = (1 - (now - q.time) / SEISMO_WIN) * w;
        const d = x - qx;
        if (Math.abs(d) < 28) {
          const A = Math.min(Math.max(q.mag, 0) / 7, 1) * (h * 0.42);
          amp += A * Math.exp(-(d * d) / (2 * 7 * 7)) * Math.sin(d * 0.9);
          if (Math.abs(amp) > peakAmp) { peakAmp = Math.abs(amp); peakX = x; }
        }
      }
      const y = mid - amp;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#ff2a1e"); grad.addColorStop(1, "#7a0b10");
    ctx.strokeStyle = grad; ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(230,32,28,.85)"; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0;

    // bleed a drip from the tallest peak now and then
    if (peakX >= 0 && peakAmp > h * 0.16 && Math.random() < 0.06) {
      _drips.push({ x: peakX, y: mid - peakAmp * 0.7, vy: 0.15 + Math.random() * 0.35, len: 2 + Math.random() * 4, life: 1 });
      if (_drips.length > 50) _drips.shift();
    }
    for (let i = _drips.length - 1; i >= 0; i--) {
      const d = _drips[i]; d.y += d.vy; d.vy += 0.02; d.life -= 0.012;
      if (d.life <= 0 || d.y > h) { _drips.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(176,7,16,${Math.max(0, d.life)})`;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, 1.3, d.len, 0, 0, Math.PI * 2); ctx.fill();
    }

    _seismoRaf = requestAnimationFrame(draw);
  }
  cancelAnimationFrame(_seismoRaf);
  draw();
}

function renderQuakeList() {
  const el = document.getElementById("quake-rows");
  if (!el) return;
  if (!_quakes.length) { el.innerHTML = `<div class="tmuted">no events in the last hour</div>`; return; }
  const ago = t => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? "now" : m + "m"; };
  el.innerHTML = _quakes.slice(0, 5).map(q => `
    <div class="trow">
      <span class="tn">${shortPlace(q.place)}<small class="qago"> ${ago(q.time)}</small></span>
      <span class="tv" style="color:${magColor(q.mag)}">M${q.mag.toFixed(1)}</span>
    </div>`).join("");
}

function plotQuakes() {
  if (!quakeLayer) return;
  quakeLayer.clearLayers();
  _quakes.forEach(q => {
    const c = magColor(q.mag), r = 2 + Math.max(q.mag, 0) * 1.4;
    L.circleMarker([q.lat, q.lon], { radius: r, color: c, weight: 1, fillColor: c, fillOpacity: .3 })
      .bindTooltip(`M${q.mag.toFixed(1)} · ${q.place}`, { className: "telem-tip", direction: "top" })
      .on("click", () => inspect({
        kind: "Earthquake · USGS", title: "M " + q.mag.toFixed(1),
        rows: [
          { k: "Location", v: q.place, full: true },
          { k: "Magnitude", v: q.mag.toFixed(1), color: c },
          { k: "Depth", v: q.depth != null ? q.depth.toFixed(1) + " km" : null },
          { k: "Time", v: new Date(q.time).toLocaleString() },
          { k: "Felt reports", v: q.felt || null },
          { k: "Tsunami flag", v: q.tsunami ? "YES" : null, color: "#e6201c" },
        ], lat: q.lat, lon: q.lon, link: q.url, linkLabel: "USGS event ↗",
      }))
      .addTo(quakeLayer);
  });
}

async function refreshQuakes() {
  try { _quakes = await loadQuakes(); renderQuakeList(); plotQuakes(); } catch (e) {}
}

function initSeismo() {
  if (typeof map !== "undefined" && map) quakeLayer = L.layerGroup().addTo(map);
  startSeismo();
  refreshQuakes();
  setInterval(refreshQuakes, 60 * 1000);
}
initSeismo();
