// app.js — rendering, dossier, controls, boot. Depends on geo/shark/data globals.

const chart = document.getElementById('chart');
const NS = "http://www.w3.org/2000/svg";
const el = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

let showTrails = true, recentOnly = false, selId = null;

// ---------- base chart (sea, grid, land, sonar sweep, layers) ----------
function drawBase() {
  chart.innerHTML = "";
  const defs = el("defs");
  defs.innerHTML = `
    <radialGradient id="sea" cx="50%" cy="42%" r="75%">
      <stop offset="0" stop-color="#0f2c36"/><stop offset="60%" stop-color="#091820"/><stop offset="100%" stop-color="#05090d"/>
    </radialGradient>
    <radialGradient id="sweepg" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="rgba(47,182,182,.0)"/><stop offset="78%" stop-color="rgba(47,182,182,.10)"/>
      <stop offset="100%" stop-color="rgba(47,182,182,.34)"/>
    </radialGradient>`;
  chart.appendChild(defs);
  chart.appendChild(el("rect", { x:0, y:0, width:VB.w, height:VB.h, fill:"url(#sea)" }));

  // grid
  const g = el("g", { stroke:"#16323b", "stroke-width":.6, opacity:.55 });
  for (let lon=-150; lon<=150; lon+=30){ const p=proj(lon,0).x; g.appendChild(el("line",{x1:p,y1:0,x2:p,y2:VB.h})); }
  for (let lat=-60;  lat<=60;  lat+=30){ const p=proj(0,lat).y; g.appendChild(el("line",{x1:0,y1:p,x2:VB.w,y2:p})); }
  chart.appendChild(g);

  // land
  const lg = el("g");
  LAND.forEach(poly => {
    const pts = poly.map(([lo,la]) => { const q=proj(lo,la); return q.x+","+q.y; }).join(" ");
    lg.appendChild(el("polygon", { points:pts, fill:"#0c1a17", "fill-opacity":.62, stroke:"#143b33", "stroke-width":.8 }));
  });
  chart.appendChild(lg);

  // sonar sweep centered on a north-atlantic hotspot
  const sc = proj(-55, 30);
  const sweep = el("g", { class:"sweep" });
  sweep.style.transformOrigin = `${sc.x}px ${sc.y}px`;
  sweep.appendChild(el("path", { d:`M${sc.x} ${sc.y} L${sc.x+420} ${sc.y} A420 420 0 0 1 ${sc.x+297} ${sc.y+297} Z`, fill:"url(#sweepg)" }));
  chart.appendChild(sweep);

  chart.appendChild(el("g", { id:"trails" }));
  chart.appendChild(el("g", { id:"fins" }));
}

// ---------- per-frame render of trails + markers ----------
function render() {
  const trails = chart.querySelector('#trails'), fins = chart.querySelector('#fins');
  trails.innerHTML = ""; fins.innerHTML = "";
  const sp = document.getElementById('sp').value;
  let shown = 0;

  SHARKS.forEach(s => {
    if (sp !== "*" && s.species !== sp) return;
    const lp = lastPing(s); if (!lp) return;
    const t = parseTz(lp.tz_datetime);
    if (recentOnly && daysAgo(t) > 30) return;
    shown++;

    if (showTrails && s.pings.length > 1) {
      const pts = s.pings.map(p => { const q=proj(+p.longitude,+p.latitude); return q.x+","+q.y; }).join(" ");
      trails.appendChild(el("polyline", { points:pts, fill:"none", stroke:"#7a0b10", "stroke-width":1.4,
        "stroke-opacity":.55, "stroke-linejoin":"round", "stroke-dasharray":"1 5", "stroke-linecap":"round" }));
      s.pings.forEach(p => { const q=proj(+p.longitude,+p.latitude);
        trails.appendChild(el("circle", { cx:q.x, cy:q.y, r:1.3, fill:"#9c1118", "fill-opacity":.6 })); });
    }

    const q = proj(+lp.longitude, +lp.latitude);
    const hot = daysAgo(t) <= 14;
    const sel = selId === s.id;
    const grp = el("g", { class:"shark"+(sel?" sel":""), transform:`translate(${q.x},${q.y})` });
    grp.dataset.id = s.id;

    grp.appendChild(el("circle", { class:"pulse", cx:0, cy:0, r:4, fill:"none", stroke:hot?"#e6201c":"#2fb6b6", "stroke-width":1.4 }));
    grp.appendChild(el("circle", { cx:0, cy:0, r:2.2, class:hot?"ping-now":"", fill:hot?"#e6201c":"#2fb6b6" }));

    const flip = bearingWest(s) ? -1 : 1;
    const holder = el("g", { transform:`translate(0,-1) scale(${flip},1)` });
    holder.innerHTML = sharkSVG(sel ? 0.82 : 0.6, hot);
    grp.appendChild(holder);

    const nm = el("text", { class:"nm", x:0, y:flip<0?22:-16, "text-anchor":"middle" });
    nm.textContent = (s.name || "Unknown").toUpperCase();
    grp.appendChild(nm);

    grp.addEventListener('click', () => select(s.id));
    fins.appendChild(grp);
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

  drawBase();
  render();
}

load().then(boot);
